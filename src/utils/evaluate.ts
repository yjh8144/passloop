import type { Question } from "../lib/types"
import { isAnswerCorrect } from "../lib/question"
import type { AnswerMap } from "../hooks/types"

export function evaluateQuestion(question: Question, answers: AnswerMap) {
  return isAnswerCorrect(question, answers[question.id] ?? "")
}

export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) return `${minutes}:${String(seconds).padStart(2, "0")}`
  const hours = Math.floor(minutes / 60)
  return `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}
