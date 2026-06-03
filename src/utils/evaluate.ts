import type { Question } from "../lib/types"
import { isAnswerCorrect } from "../lib/question"
import type { AnswerMap, ResultMap } from "../hooks/types"

export function evaluateQuestion(question: Question, answers: AnswerMap) {
  return isAnswerCorrect(question, answers[question.id] ?? "")
}

// True when there is at least one answer that has non-empty content but has not
// yet been submitted (i.e. is not recorded in results). Shared so the list-switch
// warning and the page-unload guard stay in sync.
export function hasUnsubmittedProgress(answers: AnswerMap, results: ResultMap): boolean {
  return Object.keys(answers).some((id) => {
    if (id in results) return false
    const val = answers[id]
    if (Array.isArray(val)) return val.some((s) => s.trim())
    return typeof val === "string" && val.trim().length > 0
  })
}

export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) return `${minutes}:${String(seconds).padStart(2, "0")}`
  const hours = Math.floor(minutes / 60)
  return `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}
