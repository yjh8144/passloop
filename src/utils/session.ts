import {
  ANSWERS_SESSION_KEY,
  INDEX_SESSION_KEY,
  POSITIONS_STORAGE_KEY,
  WRONG_SESSION_KEY,
  PAGE_SESSION_KEY,
  SUPPRESS_EMPTY_CONFIRM_KEY,
} from "./constants"
import type { AnswerMap } from "../hooks/types"
import type { WrongSession } from "../hooks/practiceReducer"
import { debugError } from "../lib/debug"

export function loadSessionAnswers(): AnswerMap {
  try {
    const raw = sessionStorage.getItem(ANSWERS_SESSION_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (e) {
    debugError("loadSessionAnswers failed", e)
    return {}
  }
}

export function saveSessionAnswers(answers: AnswerMap) {
  sessionStorage.setItem(ANSWERS_SESSION_KEY, JSON.stringify(answers))
}

export function loadSessionIndex(): number {
  try {
    const raw = sessionStorage.getItem(INDEX_SESSION_KEY)
    return raw ? Number(raw) || 0 : 0
  } catch (e) {
    debugError("loadSessionIndex failed", e)
    return 0
  }
}

export function saveSessionIndex(index: number) {
  sessionStorage.setItem(INDEX_SESSION_KEY, String(index))
}

export function loadPosition(listId: string): number {
  try {
    const raw = localStorage.getItem(POSITIONS_STORAGE_KEY)
    const positions = raw ? JSON.parse(raw) : {}
    return typeof positions[listId] === "number" ? positions[listId] : 0
  } catch {
    return 0
  }
}

export function savePosition(listId: string, index: number) {
  try {
    const raw = localStorage.getItem(POSITIONS_STORAGE_KEY)
    const positions = raw ? JSON.parse(raw) : {}
    positions[listId] = index
    localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(positions))
  } catch {
    /* ignore */
  }
}

export function clearPosition(listId: string) {
  try {
    const raw = localStorage.getItem(POSITIONS_STORAGE_KEY)
    const positions = raw ? JSON.parse(raw) : {}
    delete positions[listId]
    localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(positions))
  } catch {
    /* ignore */
  }
}

export function loadWrongSession(): WrongSession | null {
  try {
    const raw = sessionStorage.getItem(WRONG_SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveWrongSession(session: WrongSession | null) {
  if (session) {
    sessionStorage.setItem(WRONG_SESSION_KEY, JSON.stringify(session))
  } else {
    sessionStorage.removeItem(WRONG_SESSION_KEY)
  }
}

export function loadSessionPage(): string | null {
  return sessionStorage.getItem(PAGE_SESSION_KEY)
}

export function saveSessionPage(page: string) {
  sessionStorage.setItem(PAGE_SESSION_KEY, page)
}

export function loadSuppressEmptyConfirm(): boolean {
  try {
    return sessionStorage.getItem(SUPPRESS_EMPTY_CONFIRM_KEY) === "1"
  } catch {
    return false
  }
}

export function saveSuppressEmptyConfirm(value: boolean) {
  if (value) sessionStorage.setItem(SUPPRESS_EMPTY_CONFIRM_KEY, "1")
  else sessionStorage.removeItem(SUPPRESS_EMPTY_CONFIRM_KEY)
}
