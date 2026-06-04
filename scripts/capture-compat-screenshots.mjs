const targetUrl =
  process.argv.find((arg) => arg.startsWith("--url="))?.slice("--url=".length) ||
  "http://127.0.0.1:8810/"
const port = Number(process.argv.find((arg) => arg.startsWith("--port="))?.slice("--port=".length)) || 9223

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
        if (message.error) reject(new Error(`${message.error.message}: ${message.error.data || ""}`))
        else resolve(message.result || {})
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

async function waitForEvent(client, method, timeout = 30000, afterIndex = 0) {
  const started = Date.now()
  let cursor = afterIndex
  while (Date.now() - started < timeout) {
    const index = client.events.findIndex((event, i) => i >= cursor && event.method === method)
    if (index >= 0) return client.events[index]
    cursor = client.events.length
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Timed out waiting for ${method}`)
}

async function capture({ width, height, mobile, path }) {
  const page = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
    method: "PUT",
  }).then((res) => res.json())
  const client = new CdpClient(page.webSocketDebuggerUrl)
  await client.ready()
  await client.send("Page.enable")
  await client.send("Runtime.enable")
  await client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: mobile ? 2 : 1,
    mobile,
  })
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `localStorage.setItem("passloop.onboarding.shown", "1");`,
  })
  const cursor = client.events.length
  await client.send("Page.navigate", { url: targetUrl })
  await waitForEvent(client, "Page.loadEventFired", 30000, cursor)
  await new Promise((resolve) => setTimeout(resolve, 500))
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  })
  const fs = await import("node:fs/promises")
  await fs.writeFile(path, Buffer.from(screenshot.data, "base64"))
  client.close()
  fetch(`http://127.0.0.1:${port}/json/close/${page.id}`).catch(() => {})
}

await capture({
  width: 1366,
  height: 768,
  mobile: false,
  path: "/private/tmp/passloop-desktop-final.png",
})
await capture({
  width: 320,
  height: 640,
  mobile: true,
  path: "/private/tmp/passloop-mobile-final.png",
})

console.log(
  JSON.stringify({
    desktop: "/private/tmp/passloop-desktop-final.png",
    mobile: "/private/tmp/passloop-mobile-final.png",
  }),
)
