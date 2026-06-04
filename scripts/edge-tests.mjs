import { build } from "esbuild"

const source = `
  import {
    LLM_CONFIG_STORAGE_KEY,
    LLM_MULTI_CONFIG_STORAGE_KEY,
    PROXY_STORAGE_KEY,
    loadLlmConfig,
    loadLlmMultiConfig,
    loadProxySettings,
    normalizeAppData,
    saveLlmConfig,
    saveLlmMultiConfig,
    saveProxySettings,
  } from "./src/lib/storage.ts"
  import { DEFAULT_PAGE_SIZE, NAV_WINDOW_SIZE, clampPage, getPageSlice, getWindowRange } from "./src/utils/windowing.ts"

  function equal(actual, expected) {
    if (!Object.is(actual, expected)) {
      throw new Error(\`Expected \${actual} to equal \${expected}\`)
    }
  }

  function deepEqual(actual, expected) {
    const actualText = JSON.stringify(actual)
    const expectedText = JSON.stringify(expected)
    if (actualText !== expectedText) {
      throw new Error(\`Expected \${actualText} to equal \${expectedText}\`)
    }
  }

  const memoryStorage = new Map()
  const localStorageMock = {
    getItem: (key) => memoryStorage.has(key) ? memoryStorage.get(key) : null,
    setItem: (key, value) => memoryStorage.set(key, String(value)),
    removeItem: (key) => memoryStorage.delete(key),
  }
  globalThis.window = { localStorage: localStorageMock, sessionStorage: localStorageMock }
  globalThis.localStorage = localStorageMock

  const oldSecret = "sk-should-not-survive"
  memoryStorage.set(LLM_CONFIG_STORAGE_KEY, JSON.stringify({
    provider: "openai",
    model: "gpt-test",
    endpoint: "https://api.example.test",
    apiKey: oldSecret,
    proxyEnabled: true,
    proxyUrl: "https://proxy.example.test",
    proxyKey: oldSecret,
    fillAnswer: true,
    fillExplanation: true,
  }))
  equal(loadLlmConfig({ provider: "openai", model: "", endpoint: "", apiKey: "", proxyEnabled: false, proxyUrl: "", proxyKey: "", fillAnswer: false, fillExplanation: false }).apiKey, "")
  saveLlmConfig({ provider: "openai", model: "gpt-test", endpoint: "https://api.example.test", apiKey: oldSecret, proxyEnabled: true, proxyUrl: "https://proxy.example.test", proxyKey: oldSecret, fillAnswer: true, fillExplanation: true })
  const storedV1 = JSON.parse(memoryStorage.get(LLM_CONFIG_STORAGE_KEY))
  equal(storedV1.apiKey, "")
  equal(storedV1.proxyKey, "")

  saveLlmMultiConfig({
    version: 2,
    providers: [{ id: "p1", name: "Provider", provider: "openai", endpoint: "https://api.example.test", apiKey: oldSecret, model: "gpt-test", createdAt: "2026-06-04T00:00:00.000Z", updatedAt: "2026-06-04T00:00:00.000Z" }],
    assignments: { parse: "p1", fill: "p1" },
  })
  const storedV2 = JSON.parse(memoryStorage.get(LLM_MULTI_CONFIG_STORAGE_KEY))
  equal(storedV2.providers[0].apiKey, "")
  equal(loadLlmMultiConfig({ version: 2, providers: [], assignments: { parse: null, fill: null } }).providers[0].apiKey, "")

  saveProxySettings({ proxyEnabled: true, proxyUrl: "https://proxy.example.test", proxyKey: oldSecret })
  const storedProxy = JSON.parse(memoryStorage.get(PROXY_STORAGE_KEY))
  equal(storedProxy.proxyKey, "")
  equal(loadProxySettings({ proxyEnabled: false, proxyUrl: "", proxyKey: "" }).proxyKey, "")

  const emptyData = normalizeAppData({ lists: [], activeListId: "missing", attempts: [], settings: {} })
  equal(emptyData.lists.length, 1)
  equal(emptyData.activeListId, emptyData.lists[0].id)

  const longUnicodeText = "emoji🔒 RTL\\u202E zero\\u200Bwidth ".repeat(40000)
  const normalized = normalizeAppData({
    version: 1,
    lists: [
      {
        id: "unicode-list",
        name: "Unicode",
        description: longUnicodeText,
        questions: [
          {
            id: "unicode-q",
            type: "short",
            title: longUnicodeText,
            answer: [longUnicodeText],
            explanation: longUnicodeText,
            createdAt: "2024-02-29T23:59:59.000Z",
            updatedAt: "2024-02-29T23:59:59.000Z",
          },
        ],
        createdAt: "2024-02-29T23:59:59.000Z",
        updatedAt: "2024-02-29T23:59:59.000Z",
      },
    ],
    activeListId: "unicode-list",
    attempts: [],
    settings: { typeOrder: ["short", "short", "single"] },
  })
  equal(normalized.activeListId, "unicode-list")
  equal(normalized.lists[0].questions[0].title, longUnicodeText)
  equal(normalized.lists[0].questions[0].answer[0], longUnicodeText)
  deepEqual(normalized.settings.typeOrder, ["short", "single", "multiple", "boolean", "blank"])

  const items = Array.from({ length: 10000 }, (_, index) => index)
  const firstPage = getPageSlice(items, 1, DEFAULT_PAGE_SIZE)
  equal(firstPage.items.length, 100)
  equal(firstPage.start, 0)
  equal(firstPage.end, 100)
  equal(firstPage.totalPages, 100)

  const tooHigh = getPageSlice(items, 9999, DEFAULT_PAGE_SIZE)
  equal(tooHigh.page, 100)
  equal(tooHigh.start, 9900)
  equal(tooHigh.end, 10000)

  equal(clampPage(Number.NaN, items.length, DEFAULT_PAGE_SIZE), 1)
  equal(clampPage(-4, items.length, DEFAULT_PAGE_SIZE), 1)

  const navStart = getWindowRange(10000, 0, NAV_WINDOW_SIZE)
  deepEqual(navStart, { start: 0, end: 120 })

  const navMiddle = getWindowRange(10000, 5000, NAV_WINDOW_SIZE)
  equal(navMiddle.end - navMiddle.start, 120)
  equal(navMiddle.start <= 5000 && navMiddle.end > 5000, true)

  const navEnd = getWindowRange(10000, 999999, NAV_WINDOW_SIZE)
  deepEqual(navEnd, { start: 9880, end: 10000 })
`

const result = await build({
  stdin: {
    contents: source,
    resolveDir: process.cwd(),
    sourcefile: "edge-tests-entry.ts",
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "browser",
})

const bundled = result.outputFiles[0].text
const url = `data:text/javascript;base64,${Buffer.from(bundled).toString("base64")}`
await import(url)
console.log("edge tests passed")
