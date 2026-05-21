import { useEffect, useRef, useState } from "react"
import type { MutableRefObject } from "react"
import type { AppData, Question, QuestionList, Settings, TFunc } from "../lib/types"
import { createId } from "../lib/question"
import { debugLog } from "../lib/debug"
import {
  loadSessionAnswers,
  saveSessionAnswers,
  loadSessionIndex,
  saveSessionIndex,
} from "../utils/session"
import { evaluateQuestion, collectCompositeAnswer } from "../utils/evaluate"
import type { AnswerMap, Page, PushToast, ResultMap, ShowConfirm, UpdateData } from "./types"

interface UsePracticeParams {
  t: TFunc
  page: Page
  activeList: QuestionList
  displayedQuestions: Question[]
  wrongQuestions: Question[]
  settings: Settings
  pushToast: PushToast
  showConfirm: ShowConfirm
  updateData: UpdateData
  onSubmitInWrongMode: (submitted: number, correct: number) => void
}

export function usePractice({
  t,
  page,
  activeList,
  displayedQuestions,
  wrongQuestions,
  settings,
  pushToast,
  showConfirm,
  updateData,
  onSubmitInWrongMode,
}: UsePracticeParams) {
  const [answers, setAnswers] = useState<AnswerMap>(() => loadSessionAnswers())
  const [results, setResults] = useState<ResultMap>({})
  const [currentIndex, setCurrentIndex] = useState(() => loadSessionIndex())
  const startedAtRef = useRef<Record<string, number>>({})

  useEffect(() => saveSessionAnswers(answers), [answers])
  useEffect(() => saveSessionIndex(currentIndex), [currentIndex])

  useEffect(() => {
    setCurrentIndex((index) => Math.min(index, Math.max(displayedQuestions.length - 1, 0)))
  }, [displayedQuestions.length])

  const resetPracticeState = (questions: Question[]) => {
    setCurrentIndex(0)
    setResults((current) => {
      const next = { ...current }
      for (const q of questions) {
        delete next[q.id]
        for (const sq of q.subQuestions) delete next[sq.id]
      }
      return next
    })
    setAnswers((current) => {
      const next = { ...current }
      for (const q of questions) {
        delete next[q.id]
        for (const sq of q.subQuestions) delete next[sq.id]
      }
      return next
    })
    for (const q of questions) {
      delete startedAtRef.current[q.id]
      for (const sq of q.subQuestions) delete startedAtRef.current[sq.id]
    }
  }

  const isAnswerEmpty = (question: Question): boolean => {
    if (question.type === "composite") {
      if (!question.subQuestions.length) {
        const val = answers[question.id]
        return !val || (typeof val === "string" && !val.trim())
      }
      return question.subQuestions.some((sq) => isAnswerEmpty(sq))
    }
    const val = answers[question.id]
    if (val === undefined || val === null) return true
    if (Array.isArray(val)) return val.length === 0 || val.every((v) => !v.trim())
    return typeof val === "string" && !val.trim()
  }

  const submitQuestion = (question: Question) => {
    if (question.id in results) {
      const questions = page === "wrong" ? wrongQuestions : displayedQuestions
      const allDone = questions.length > 0 && questions.every((q) => q.id in results)
      if (allDone) {
        pushToast("info", t("allQuestionsFinished"))
      }
      return
    }
    const doSubmit = () => {
      const startedAt = startedAtRef.current[question.id] ?? Date.now()
      const correct = evaluateQuestion(question, answers)
      debugLog("Question submitted", {
        questionId: question.id,
        title: question.title,
        correct,
        elapsedMs: Date.now() - startedAt,
        answer: answers[question.id],
      })
      setResults((current) => ({ ...current, [question.id]: correct }))
      if (page === "wrong") {
        onSubmitInWrongMode(1, correct ? 1 : 0)
      }
      updateData((current) => ({
        ...current,
        attempts: [
          ...current.attempts,
          {
            id: createId(),
            listId: activeList.id,
            questionId: question.id,
            answer: answers[question.id] ?? collectCompositeAnswer(question, answers),
            correct,
            elapsedMs: Math.max(1000, Date.now() - startedAt),
            submittedAt: new Date().toISOString(),
          },
        ],
      }))
      if (settings.revealMode === "end") {
        pushToast("info", t("submittedMsg"))
      } else {
        pushToast(correct ? "success" : "info", correct ? t("answerCorrect") : t("recordedAsWrong"))
      }
      if (settings.autoNext) {
        const questions = page === "wrong" ? wrongQuestions : displayedQuestions
        if (settings.viewMode === "single") {
          const questionCount = questions.length
          if (currentIndex < questionCount - 1) {
            window.setTimeout(
              () => setCurrentIndex((index) => Math.min(index + 1, questionCount - 1)),
              500,
            )
          }
        } else if (settings.viewMode === "paper") {
          const questionIndex = questions.findIndex((q) => q.id === question.id)
          if (questionIndex >= 0 && questionIndex < questions.length - 1) {
            window.setTimeout(() => {
              const el = document.getElementById(`question-${questionIndex + 1}`)
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
            }, 500)
          }
        }
      }
    }
    if (isAnswerEmpty(question)) {
      const questions = page === "wrong" ? wrongQuestions : displayedQuestions
      const idx = questions.findIndex((q) => q.id === question.id)
      showConfirm(t("confirmEmptySubmit", idx + 1), doSubmit)
    } else {
      doSubmit()
    }
  }

  const submitAll = () => {
    const questions = page === "wrong" ? wrongQuestions : displayedQuestions
    const unsubmitted = questions.filter((q) => !(q.id in results))
    if (!unsubmitted.length) return
    const emptyQuestions = unsubmitted.filter((q) => isAnswerEmpty(q))
    const doSubmitAll = () => {
      debugLog("Submit all", {
        totalQuestions: questions.length,
        unsubmittedCount: unsubmitted.length,
      })
      let correctCount = 0
      const newAttempts: AppData["attempts"] = []
      const newResults: ResultMap = {}
      for (const question of unsubmitted) {
        const startedAt = startedAtRef.current[question.id] ?? Date.now()
        const correct = evaluateQuestion(question, answers)
        newResults[question.id] = correct
        if (correct) correctCount++
        newAttempts.push({
          id: createId(),
          listId: activeList.id,
          questionId: question.id,
          answer: answers[question.id] ?? collectCompositeAnswer(question, answers),
          correct,
          elapsedMs: Math.max(1000, Date.now() - startedAt),
          submittedAt: new Date().toISOString(),
        })
      }
      setResults((current) => ({ ...current, ...newResults }))
      updateData((current) => ({
        ...current,
        attempts: [...current.attempts, ...newAttempts],
      }))
      if (page === "wrong") {
        onSubmitInWrongMode(unsubmitted.length, correctCount)
      }
      pushToast("success", t("submitAllResult", unsubmitted.length, correctCount))
    }
    if (emptyQuestions.length) {
      const nums = emptyQuestions.map((q) => questions.indexOf(q) + 1).join(", ")
      showConfirm(t("confirmEmptySubmitAll", nums), doSubmitAll)
    } else {
      doSubmitAll()
    }
  }

  return {
    answers,
    setAnswers,
    results,
    setResults,
    currentIndex,
    setCurrentIndex,
    startedAtRef: startedAtRef as MutableRefObject<Record<string, number>>,
    submitQuestion,
    submitAll,
    resetPracticeState,
  }
}

export type UsePracticeReturn = ReturnType<typeof usePractice>
