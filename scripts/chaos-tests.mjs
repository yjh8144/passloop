import assert from "node:assert/strict"
import test from "node:test"

import {
  LLM_CONFIG_STORAGE_KEY,
  LLM_MULTI_CONFIG_STORAGE_KEY,
  PROXY_STORAGE_KEY,
  STORAGE_KEY,
  createDefaultData,
  loadData,
  loadLlmConfig,
  loadLlmMultiConfig,
  loadProxySettings,
  saveData,
} from "../src/lib/storage.ts"
import {
  loadPosition,
  loadSessionAnswers,
  loadSessionIndex,
  loadSuppressEmptyConfirm,
  loadWrongSession,
  savePosition,
  saveSessionAnswers,
  saveSessionIndex,
  saveSuppressEmptyConfirm,
  saveWrongSession,
} from "../src/utils/session.ts"
import {
  safeGetStorageItem,
  safeRemoveStorageItem,
  safeSetStorageItem,
} from "../src/utils/safeStorage.ts"
import { elapsedSince } from "../src/utils/time.ts"
import { defaultLlmConfig, defaultLlmMultiConfig, defaultProxySettings } from "../src/utils/constants.ts"

class MemoryStorage {
  #items = new Map()

  getItem(key) {
    return this.#items.has(key) ? this.#items.get(key) : null
  }

  setItem(key, value) {
    this.#items.set(key, String(value))
  }

  removeItem(key) {
    this.#items.delete(key)
  }

  clear() {
    this.#items.clear()
  }
}

class ThrowingStorage {
  getItem() {
    throw new Error("chaos storage denied")
  }

  setItem() {
    throw new Error("chaos storage denied")
  }

  removeItem() {
    throw new Error("chaos storage denied")
  }
}

function installWindow({ local = new MemoryStorage(), session = new MemoryStorage() } = {}) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: local, sessionStorage: session },
  })
  return { local, session }
}

test("safeStorage turns denied browser storage into recoverable results", () => {
  installWindow({ local: new ThrowingStorage(), session: new ThrowingStorage() })

  assert.equal(safeGetStorageItem("local", "x"), null)
  assert.equal(safeSetStorageItem("local", "x", "1"), false)
  assert.equal(safeRemoveStorageItem("session", "x"), false)
})

test("app data loads defaults from missing, corrupted, or denied localStorage", () => {
  const { local } = installWindow()

  assert.equal(loadData().lists.length, 1)

  local.setItem(STORAGE_KEY, "{not-json")
  const recovered = loadData()
  assert.equal(recovered.lists.length, 1)
  assert.equal(recovered.activeListId, recovered.lists[0].id)

  installWindow({ local: new ThrowingStorage() })
  assert.equal(loadData().lists.length, 1)
  assert.equal(saveData(createDefaultData()), false)
})

test("session persistence survives refresh chaos with denied sessionStorage", () => {
  installWindow({ session: new ThrowingStorage() })

  assert.deepEqual(loadSessionAnswers(), {})
  assert.equal(saveSessionAnswers({ q1: "A" }), false)
  assert.equal(loadSessionIndex(), 0)
  assert.equal(saveSessionIndex(3), false)
  assert.equal(loadWrongSession(), null)
  assert.equal(saveWrongSession({ id: "w1", startedAt: 1, elapsedSeconds: 0, submitted: 0, correct: 0 }), false)
  assert.equal(loadSuppressEmptyConfirm(), false)
  assert.equal(saveSuppressEmptyConfirm(true), false)
})

test("position persistence tolerates cleared, corrupted, and denied localStorage", () => {
  const { local } = installWindow()

  assert.equal(savePosition("list-1", 5), true)
  assert.equal(loadPosition("list-1"), 5)

  local.setItem("passloop.session.positions", "{bad")
  assert.equal(loadPosition("list-1"), 0)

  installWindow({ local: new ThrowingStorage() })
  assert.equal(loadPosition("list-1"), 0)
  assert.equal(savePosition("list-1", 2), false)
})

test("LLM and proxy config loaders fall back when storage is cleared or denied", () => {
  const { local } = installWindow()

  assert.deepEqual(loadLlmConfig(defaultLlmConfig), defaultLlmConfig)
  assert.deepEqual(loadLlmMultiConfig(defaultLlmMultiConfig), defaultLlmMultiConfig)
  assert.deepEqual(loadProxySettings(defaultProxySettings), defaultProxySettings)

  local.setItem(LLM_CONFIG_STORAGE_KEY, "{bad")
  local.setItem(LLM_MULTI_CONFIG_STORAGE_KEY, "{bad")
  local.setItem(PROXY_STORAGE_KEY, "{bad")
  assert.deepEqual(loadLlmConfig(defaultLlmConfig), defaultLlmConfig)
  assert.deepEqual(loadLlmMultiConfig(defaultLlmMultiConfig), defaultLlmMultiConfig)
  assert.deepEqual(loadProxySettings(defaultProxySettings), defaultProxySettings)
})

test("elapsed time stays valid when system time jumps backward or becomes invalid", () => {
  assert.equal(elapsedSince(2_000, 1_000), 1_000)
  assert.equal(elapsedSince(Number.NaN, 1_000), 1_000)
  assert.equal(elapsedSince(1_000, Number.POSITIVE_INFINITY), 1_000)
  assert.equal(elapsedSince(1_000, 3_500), 2_500)
})
