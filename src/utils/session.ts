import { ANSWERS_SESSION_KEY, INDEX_SESSION_KEY } from "./constants"

type AnswerMap = Record<string, string | string[]>

export function loadSessionAnswers(): AnswerMap {
  try {
    const raw = sessionStorage.getItem(ANSWERS_SESSION_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
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
  } catch {
    return 0
  }
}

export function saveSessionIndex(index: number) {
  sessionStorage.setItem(INDEX_SESSION_KEY, String(index))
}
