import { safeGetStorageItem, safeRemoveStorageItem, safeSetStorageItem } from "../utils/safeStorage"

const DEBUG_STORAGE_KEY = "passloop.debug"

export function isDebugEnabled(): boolean {
  return safeGetStorageItem("local", DEBUG_STORAGE_KEY) === "1"
}

export function setDebugEnabled(enabled: boolean) {
  if (enabled) {
    safeSetStorageItem("local", DEBUG_STORAGE_KEY, "1")
  } else {
    safeRemoveStorageItem("local", DEBUG_STORAGE_KEY)
  }
}

export function debugLog(...args: unknown[]) {
  if (isDebugEnabled()) {
    console.log("[PassLoop Debug]", ...args)
  }
}

export function debugWarn(...args: unknown[]) {
  if (isDebugEnabled()) {
    console.warn("[PassLoop Warn]", ...args)
  }
}

export function debugError(...args: unknown[]) {
  // Errors are always surfaced so production failures aren't silently swallowed;
  // verbose log/warn output stays behind the debug flag.
  console.error("[PassLoop Error]", ...args)
}
