const DEFAULT_URL = "http://121.40.35.52:9364/"
const DEFAULT_PORT = 9223

const targetUrl =
  process.argv.find((arg) => arg.startsWith("--url="))?.slice("--url=".length) || DEFAULT_URL
const port =
  Number(process.argv.find((arg) => arg.startsWith("--port="))?.slice("--port=".length)) ||
  DEFAULT_PORT

const userAgents = [
  {
    name: "chrome-desktop",
    ua:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  },
  {
    name: "firefox-desktop",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0",
  },
  {
    name: "safari-desktop",
    ua:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 " +
      "(KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  },
  {
    name: "mobile-safari",
    ua:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 " +
      "(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    mobile: true,
  },
]

const viewports = [
  { name: "phone-320", width: 320, height: 640, mobile: true, deviceScaleFactor: 2 },
  { name: "phone-390", width: 390, height: 844, mobile: true, deviceScaleFactor: 3 },
  { name: "tablet-768", width: 768, height: 1024, mobile: true, deviceScaleFactor: 2 },
  { name: "desktop-1366", width: 1366, height: 768, mobile: false, deviceScaleFactor: 1 },
  { name: "desktop-4k", width: 3840, height: 2160, mobile: false, deviceScaleFactor: 1 },
]

const slow3g = {
  offline: false,
  latency: 400,
  downloadThroughput: (500 * 1024) / 8,
  uploadThroughput: (500 * 1024) / 8,
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl)
    this.seq = 0
    this.pending = new Map()
    this.events = []
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id)
        this.pending.delete(message.id)
        if (message.error) {
          reject(new Error(`${message.error.message}: ${message.error.data || ""}`))
        } else {
          resolve(message.result || {})
        }
      } else if (message.method) {
        this.events.push(message)
      }
    }
  }

  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) return
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve
      this.ws.onerror = reject
    })
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.seq
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  close() {
    this.ws.close()
  }
}

async function newPage() {
  const page = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
    method: "PUT",
  }).then((res) => res.json())
  const client = new CdpClient(page.webSocketDebuggerUrl)
  await client.ready()
  await client.send("Page.enable")
  await client.send("Runtime.enable")
  await client.send("Network.enable")
  await client.send("Log.enable")
  await client.send("Performance.enable")
  return { page, client }
}

async function waitForEvent(client, method, timeout = 30000, afterIndex = 0) {
  const started = Date.now()
  let cursor = afterIndex
  while (Date.now() - started < timeout) {
    const index = client.events.findIndex((event, i) => i >= cursor && event.method === method)
    if (index >= 0) return client.events[index]
    cursor = client.events.length
    await delay(100)
  }
  throw new Error(`Timed out waiting for ${method}`)
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function evaluate(client, expression, returnByValue = true) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue,
  })
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Evaluation failed")
  }
  return result.result?.value
}

async function setupEnvironment(client, { ua, viewport, javaScriptDisabled = false, network }) {
  client.events.length = 0
  await client.send("Network.clearBrowserCache").catch(() => {})
  await client.send("Network.clearBrowserCookies").catch(() => {})
  await client.send("Network.setUserAgentOverride", {
    userAgent: ua.ua,
    platform: ua.mobile || viewport.mobile ? "iPhone" : "macOS",
  })
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.deviceScaleFactor,
    mobile: ua.mobile || viewport.mobile,
  })
  await client.send("Emulation.setScriptExecutionDisabled", { value: javaScriptDisabled })
  if (network) {
    await client.send("Network.emulateNetworkConditions", network)
  } else {
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    })
  }
}

async function navigate(client) {
  const cursor = client.events.length
  await client.send("Page.navigate", { url: targetUrl })
  await waitForEvent(client, "Page.loadEventFired", 45000, cursor)
  await delay(250)
}

async function suppressOnboarding(client) {
  const suppressed = await evaluate(
    client,
    `(() => {
      try {
        localStorage.setItem("passloop.onboarding.shown", "1");
      } catch {
        return false;
      }
      return true;
    })()`,
  ).catch(() => false)
  const closed = await clickByClass(client, ".modal-header .icon-button").catch(() => false)
  if (suppressed && !closed) {
    const cursor = client.events.length
    await client.send("Page.reload", { ignoreCache: true })
    await waitForEvent(client, "Page.loadEventFired", 45000, cursor)
    await delay(250)
  }
}

async function collectPageState(client) {
  return evaluate(
    client,
    `(() => {
      const root = document.querySelector("#root");
      const width = document.documentElement.scrollWidth;
      const height = document.documentElement.scrollHeight;
      const overflowing = [...document.querySelectorAll("body *")].filter((el) => {
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        const style = getComputedStyle(el);
        if (style.position === "fixed") return false;
        return rect.right > innerWidth + 1 || rect.left < -1;
      }).slice(0, 12).map((el) => ({
        tag: el.tagName,
        className: String(el.className || ""),
        text: (el.innerText || el.textContent || "").trim().slice(0, 80),
        rect: Object.fromEntries(["left", "right", "width", "top", "bottom"].map((key) => [key, Math.round(el.getBoundingClientRect()[key])])),
      }));
      return {
        url: location.href,
        title: document.title,
        viewport: { width: innerWidth, height: innerHeight },
        scroll: { width, height },
        hasHorizontalOverflow: width > innerWidth + 1,
        rootText: (root?.innerText || "").slice(0, 500),
        bodyText: document.body.innerText.slice(0, 500),
        dialogs: [...document.querySelectorAll('[role="dialog"], .modal-card')].map((el) => (el.innerText || "").slice(0, 120)),
        buttons: [...document.querySelectorAll("button")].map((el) => (el.innerText || el.getAttribute("title") || el.getAttribute("aria-label") || "").trim()).filter(Boolean).slice(0, 40),
        overflowCandidates: overflowing,
      };
    })()`,
  )
}

async function clickByText(client, text) {
  return evaluate(
    client,
    `(() => {
      const text = ${JSON.stringify(text)};
      const match = [...document.querySelectorAll("button")].find((button) =>
        button.offsetParent !== null &&
        (button.innerText || button.title || button.getAttribute("aria-label") || "").includes(text)
      );
      if (!match) return false;
      match.click();
      return true;
    })()`,
  )
}

async function waitAndClickByText(client, text, timeout = 8000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    if (await clickByText(client, text).catch(() => false)) return true
    await delay(150)
  }
  return false
}

async function clickByClass(client, className) {
  return evaluate(
    client,
    `(() => {
      const match = [...document.querySelectorAll(${JSON.stringify(className)})].find((element) => element.offsetParent !== null);
      if (!match) return false;
      match.click();
      return true;
    })()`,
  )
}

async function waitAndClickByClass(client, className, timeout = 8000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    if (await clickByClass(client, className).catch(() => false)) return true
    await delay(150)
  }
  return false
}

async function fillQuestion(client) {
  return evaluate(
    client,
    `(() => {
      const input = document.querySelector(".question-editor input, .question-editor textarea, input, textarea");
      if (!input) return false;
      input.value = "兼容性测试题";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    })()`,
  )
}

async function exerciseCore(client, scenario) {
  const actions = []
  actions.push({
    action: "close-onboarding",
    ok: !(await evaluate(client, `Boolean(document.querySelector(".modal-overlay"))`)),
  })
  actions.push({
    action: "open-list-picker",
    ok: await waitAndClickByClass(client, ".list-picker-trigger"),
  })
  await delay(100)
  actions.push({ action: "add-list", ok: await waitAndClickByText(client, "新建题单") })
  await delay(100)
  actions.push({ action: "confirm-add-list", ok: await waitAndClickByText(client, "确定") })
  await delay(150)
  actions.push({ action: "go-manager", ok: await waitAndClickByText(client, "题库管理") })
  await delay(200)
  actions.push({ action: "add-question", ok: await waitAndClickByText(client, "新增题目") })
  await delay(200)
  actions.push({ action: "manager-fill", ok: await fillQuestion(client) })
  actions.push({ action: "go-llm", ok: await waitAndClickByText(client, "LLM") })
  await delay(200)
  if (scenario.viewport.mobile || scenario.ua.mobile) {
    actions.push({
      action: "open-mobile-panel",
      ok: await waitAndClickByClass(client, ".bottom-nav-expand"),
    })
    await delay(100)
  } else {
    actions.push({ action: "open-mobile-panel", ok: true, skipped: "desktop viewport" })
  }
  return actions
}

async function collectPerformance(client) {
  const metrics = await client.send("Performance.getMetrics")
  const named = Object.fromEntries(metrics.metrics.map((metric) => [metric.name, metric.value]))
  const nav = await evaluate(
    client,
    `(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const resources = performance.getEntriesByType("resource");
      return {
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
        load: Math.round(nav.loadEventEnd),
        transfer: Math.round(resources.reduce((sum, item) => sum + (item.transferSize || 0), 0)),
        resources: resources.map((item) => ({
          name: item.name,
          type: item.initiatorType,
          duration: Math.round(item.duration),
          transferSize: item.transferSize || 0,
        })).sort((a, b) => b.duration - a.duration).slice(0, 8),
      };
    })()`,
  )
  return {
    jsHeapUsed: Math.round(named.JSHeapUsedSize || 0),
    nodes: Math.round(named.Nodes || 0),
    layoutCount: Math.round(named.LayoutCount || 0),
    recalcStyleCount: Math.round(named.RecalcStyleCount || 0),
    navigation: nav,
  }
}

async function runScenario(scenario) {
  const { client, page } = await newPage()
  const errors = []
  client.events.length = 0
  try {
    await setupEnvironment(client, scenario)
    await navigate(client)
    if (!scenario.javaScriptDisabled) await suppressOnboarding(client)
    const beforeActions = await collectPageState(client)
    const actions = scenario.javaScriptDisabled ? [] : await exerciseCore(client, scenario)
    const afterActions = await collectPageState(client)
    const performance = scenario.javaScriptDisabled ? null : await collectPerformance(client)
    const runtimeErrors = client.events
      .filter((event) => event.method === "Runtime.exceptionThrown" || event.method === "Log.entryAdded")
      .map((event) => event.params)
    return {
      name: scenario.name,
      ua: scenario.ua.name,
      viewport: scenario.viewport.name,
      slow3g: Boolean(scenario.network),
      javaScriptDisabled: scenario.javaScriptDisabled,
      beforeActions,
      actions,
      afterActions,
      performance,
      runtimeErrors,
    }
  } catch (error) {
    errors.push(String(error?.stack || error))
    return {
      name: scenario.name,
      ua: scenario.ua.name,
      viewport: scenario.viewport.name,
      slow3g: Boolean(scenario.network),
      javaScriptDisabled: scenario.javaScriptDisabled,
      errors,
    }
  } finally {
    client.close()
    fetch(`http://127.0.0.1:${port}/json/close/${page.id}`).catch(() => {})
  }
}

const scenarios = [
  ...userAgents.map((ua) => ({
    name: `ua-${ua.name}`,
    ua,
    viewport: viewports.find((viewport) => viewport.name === (ua.mobile ? "phone-390" : "desktop-1366")),
  })),
  ...viewports.map((viewport) => ({
    name: `viewport-${viewport.name}`,
    ua: userAgents[0],
    viewport,
  })),
  {
    name: "slow-3g-phone",
    ua: userAgents[3],
    viewport: viewports[0],
    network: slow3g,
  },
  {
    name: "no-javascript",
    ua: userAgents[0],
    viewport: viewports[3],
    javaScriptDisabled: true,
  },
]

const startedAt = new Date().toISOString()
const results = []
for (const scenario of scenarios) {
  console.error(`Running ${scenario.name}`)
  results.push(await runScenario(scenario))
}

const summary = {
  startedAt,
  targetUrl,
  results,
}

console.log(JSON.stringify(summary, null, 2))
