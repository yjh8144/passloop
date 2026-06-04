type StorageArea = "local" | "session"

function getStorage(area: StorageArea): Storage | null {
  try {
    return area === "local" ? window.localStorage : window.sessionStorage
  } catch (error) {
    console.error("[PassLoop Error]", `${area}Storage unavailable`, error)
    return null
  }
}

export function safeGetStorageItem(area: StorageArea, key: string): string | null {
  try {
    return getStorage(area)?.getItem(key) ?? null
  } catch (error) {
    console.error("[PassLoop Error]", `Failed to read ${area}Storage key ${key}`, error)
    return null
  }
}

export function safeSetStorageItem(area: StorageArea, key: string, value: string): boolean {
  try {
    const storage = getStorage(area)
    if (!storage) return false
    storage.setItem(key, value)
    return true
  } catch (error) {
    console.error("[PassLoop Error]", `Failed to write ${area}Storage key ${key}`, error)
    return false
  }
}

export function safeRemoveStorageItem(area: StorageArea, key: string): boolean {
  try {
    const storage = getStorage(area)
    if (!storage) return false
    storage.removeItem(key)
    return true
  } catch (error) {
    console.error("[PassLoop Error]", `Failed to remove ${area}Storage key ${key}`, error)
    return false
  }
}
