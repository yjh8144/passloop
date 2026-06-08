import {
  ANSWERS_SESSION_KEY,
  INDEX_SESSION_KEY,
  POSITIONS_STORAGE_KEY,
  PAGE_SESSION_KEY,
  SUPPRESS_EMPTY_CONFIRM_KEY,
} from "./constants"
import type { AnswerMap } from "../hooks/types"
import { debugError } from "../lib/debug"
import { safeGetStorageItem, safeRemoveStorageItem, safeSetStorageItem } from "./safeStorage"

export function loadSessionAnswers(): AnswerMap {
  try {
    const raw = safeGetStorageItem("session", ANSWERS_SESSION_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (e) {
    debugError("loadSessionAnswers failed", e)
    return {}
  }
}

export function saveSessionAnswers(answers: AnswerMap): boolean {
  return safeSetStorageItem("session", ANSWERS_SESSION_KEY, JSON.stringify(answers))
}

export function loadSessionIndex(): number {
  try {
    const raw = safeGetStorageItem("session", INDEX_SESSION_KEY)
    return raw ? Number(raw) || 0 : 0
  } catch (e) {
    debugError("loadSessionIndex failed", e)
    return 0
  }
}

export function saveSessionIndex(index: number): boolean {
  return safeSetStorageItem("session", INDEX_SESSION_KEY, String(index))
}

export function loadPosition(listId: string): number {
  try {
    const raw = safeGetStorageItem("local", POSITIONS_STORAGE_KEY)
    const positions = raw ? JSON.parse(raw) : {}
    return typeof positions[listId] === "number" ? positions[listId] : 0
  } catch (e) {
    debugError("loadPosition failed", e)
    return 0
  }
}

export function savePosition(listId: string, index: number): boolean {
  try {
    const raw = safeGetStorageItem("local", POSITIONS_STORAGE_KEY)
    const positions = raw ? JSON.parse(raw) : {}
    positions[listId] = index
    return safeSetStorageItem("local", POSITIONS_STORAGE_KEY, JSON.stringify(positions))
  } catch (e) {
    debugError("savePosition failed", e)
    return false
  }
}

export function clearPosition(listId: string): boolean {
  try {
    const raw = safeGetStorageItem("local", POSITIONS_STORAGE_KEY)
    const positions = raw ? JSON.parse(raw) : {}
    delete positions[listId]
    return safeSetStorageItem("local", POSITIONS_STORAGE_KEY, JSON.stringify(positions))
  } catch (e) {
    debugError("clearPosition failed", e)
    return false
  }
}

export function loadSessionPage(): string | null {
  return safeGetStorageItem("session", PAGE_SESSION_KEY)
}

export function saveSessionPage(page: string): boolean {
  return safeSetStorageItem("session", PAGE_SESSION_KEY, page)
}

export function loadSuppressEmptyConfirm(): boolean {
  try {
    return safeGetStorageItem("session", SUPPRESS_EMPTY_CONFIRM_KEY) === "1"
  } catch (e) {
    debugError("loadSuppressEmptyConfirm failed", e)
    return false
  }
}

export function saveSuppressEmptyConfirm(value: boolean): boolean {
  if (value) return safeSetStorageItem("session", SUPPRESS_EMPTY_CONFIRM_KEY, "1")
  return safeRemoveStorageItem("session", SUPPRESS_EMPTY_CONFIRM_KEY)
}
