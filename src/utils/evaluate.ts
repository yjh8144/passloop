import type { Question } from "../lib/types"
import { isAnswerCorrect, formatAnswer } from "../lib/question"
import type { AnswerMap } from "../hooks/types"

export function evaluateQuestion(question: Question, answers: AnswerMap) {
  if (question.type === "composite" && question.subQuestions.length) {
    return question.subQuestions.every((subQuestion) =>
      isAnswerCorrect(subQuestion, answers[subQuestion.id] ?? ""),
    )
  }
  return isAnswerCorrect(question, answers[question.id] ?? "")
}

export function collectCompositeAnswer(question: Question, answers: AnswerMap) {
  if (question.type !== "composite") return answers[question.id] ?? ""
  return question.subQuestions.map(
    (subQuestion) => `${subQuestion.title}: ${formatAnswer(answers[subQuestion.id] ?? "")}`,
  )
}

export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) return `${minutes}:${String(seconds).padStart(2, "0")}`
  const hours = Math.floor(minutes / 60)
  return `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}
