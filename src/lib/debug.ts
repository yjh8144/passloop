const DEBUG_STORAGE_KEY = "passloop.debug"

export function isDebugEnabled(): boolean {
  return localStorage.getItem(DEBUG_STORAGE_KEY) === "1"
}

export function setDebugEnabled(enabled: boolean) {
  if (enabled) {
    localStorage.setItem(DEBUG_STORAGE_KEY, "1")
  } else {
    localStorage.removeItem(DEBUG_STORAGE_KEY)
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
  if (isDebugEnabled()) {
    console.error("[PassLoop Error]", ...args)
  }
}
