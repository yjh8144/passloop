import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react"
import type { MutableRefObject, ReactNode } from "react"
import { useAppData } from "./AppDataContext"
import { useNavigation } from "./NavigationContext"
import { useDialog } from "./DialogContext"
import { usePushToast } from "./ToastContext"
import { useT } from "./I18nContext"
import { practiceReducer } from "../hooks/practiceReducer"
import type { PracticeState, WrongSession } from "../hooks/practiceReducer"
import { useSessionPersistence } from "../hooks/useSessionPersistence"
import { useWrongPractice } from "../hooks/useWrongPractice"
import { evaluateQuestion, collectCompositeAnswer } from "../utils/evaluate"
import { createId } from "../lib/question"
import { debugLog } from "../lib/debug"
import { loadSessionAnswers, loadSessionIndex } from "../utils/session"
import type { AppData, Question } from "../lib/types"
import type { AnswerMap, ResultMap, SetState } from "../hooks/types"

interface PracticeContextValue {
  answers: AnswerMap
  setAnswers: SetState<AnswerMap>
  results: ResultMap
  currentIndex: number
  setCurrentIndex: SetState<number>
  startedAtRef: MutableRefObject<Record<string, number>>
  submitQuestion: (question: Question) => void
  submitAll: () => void

  wrongSession: WrongSession | null
  startWrongPractice: () => boolean
  resetWrongPractice: () => void
  exportWrongList: () => void
  createWrongList: () => void

  practiceQuestions: Question[]
  resetAll: () => void
}

const PracticeContext = createContext<PracticeContextValue | null>(null)

function createInitialState(): PracticeState {
  return {
    answers: loadSessionAnswers(),
    results: {},
    currentIndex: loadSessionIndex(),
    wrongSession: null,
  }
}

export function PracticeProvider({ children }: { children: ReactNode }) {
  const t = useT()
  const { page, setPage } = useNavigation()
  const {
    activeList,
    displayedQuestions,
    wrongQuestions,
    data,
    updateData,
    listResetSignal,
  } = useAppData()
  const { showConfirm } = useDialog()
  const pushToast = usePushToast()

  const [state, dispatch] = useReducer(practiceReducer, undefined, createInitialState)
  const startedAtRef = useRef<Record<string, number>>({})

  // --- Persistence ---
  useSessionPersistence(state.answers, state.currentIndex)

  // --- Clamp index when question count changes ---
  const prevLength = useRef(displayedQuestions.length)
  useEffect(() => {
    if (displayedQuestions.length !== prevLength.current) {
      prevLength.current = displayedQuestions.length
      dispatch({ type: "CLAMP_INDEX", maxIndex: Math.max(displayedQuestions.length - 1, 0) })
    }
  }, [displayedQuestions.length])

  // --- List reset signal from AppDataContext ---
  const prevResetVersion = useRef(listResetSignal.version)
  useEffect(() => {
    if (listResetSignal.version === prevResetVersion.current) return
    prevResetVersion.current = listResetSignal.version

    if (listResetSignal.mode === "full") {
      dispatch({ type: "LIST_RESET_FULL" })
      startedAtRef.current = {}
    } else {
      dispatch({ type: "LIST_RESET_SELECTIVE", questionIds: listResetSignal.questionIds })
      for (const id of listResetSignal.questionIds) delete startedAtRef.current[id]
      if (page === "wrong") setPage("practice")
    }
  }, [listResetSignal, setPage, page])

  // --- Wrong practice ---
  const practiceQuestions = page === "wrong" ? wrongQuestions : displayedQuestions

  const { startWrongPractice, resetWrongPractice, exportWrongList, createWrongList } =
    useWrongPractice({
      dispatch,
      wrongQuestions,
      wrongSession: state.wrongSession,
      page,
      setPage,
      activeList,
      updateData,
      pushToast,
      startedAtRef,
      t,
    })

  // When page transitions to "wrong" via NavigationContext (e.g. changePage("wrong")),
  // initialize wrong practice if not already active.
  // If start fails (no wrong questions), revert to the previous page.
  const prevPageRef = useRef(page)
  useEffect(() => {
    if (page === "wrong" && prevPageRef.current !== "wrong" && !state.wrongSession) {
      if (!wrongQuestions.length) {
        pushToast("info", t("noWrongQuestions"))
        setPage(prevPageRef.current)
        return
      }
      const questionIds = wrongQuestions.flatMap((q) => [q.id, ...q.subQuestions.map((sq) => sq.id)])
      debugLog("Wrong practice started (nav)", {
        questionCount: wrongQuestions.length,
        listId: activeList.id,
      })
      dispatch({
        type: "START_WRONG_PRACTICE",
        sessionId: createId(),
        startedAt: Date.now(),
        questionIds,
      })
      for (const id of questionIds) delete startedAtRef.current[id]
    }
    prevPageRef.current = page
  }, [page, state.wrongSession, wrongQuestions, activeList.id, pushToast, t, setPage])

  // --- State setters (using dispatch to avoid stale closures) ---
  const setCurrentIndex: SetState<number> = useCallback((v) => {
    if (typeof v === "function") {
      dispatch({ type: "NAVIGATE_FN", updater: v })
    } else {
      dispatch({ type: "NAVIGATE", index: v })
    }
  }, [])

  const setAnswers: SetState<AnswerMap> = useCallback((v) => {
    if (typeof v === "function") {
      dispatch({ type: "SET_ANSWERS_FN", updater: v })
    } else {
      dispatch({ type: "SET_ANSWERS", answers: v })
    }
  }, [])

  // --- Submission logic ---
  const isAnswerEmpty = useCallback((question: Question, answers: AnswerMap): boolean => {
    if (question.type === "composite") {
      if (!question.subQuestions.length) {
        const val = answers[question.id]
        return !val || (typeof val === "string" && !val.trim())
      }
      return question.subQuestions.some((sq) => {
        const v = answers[sq.id]
        if (v === undefined || v === null) return true
        if (Array.isArray(v)) return v.length === 0 || v.every((s) => !s.trim())
        return typeof v === "string" && !v.trim()
      })
    }
    const val = answers[question.id]
    if (val === undefined || val === null) return true
    if (Array.isArray(val)) return val.length === 0 || val.every((s) => !s.trim())
    return typeof val === "string" && !val.trim()
  }, [])

  const submitQuestion = useCallback(
    (question: Question) => {
      if (question.id in state.results) {
        const allDone = practiceQuestions.length > 0 && practiceQuestions.every((q) => q.id in state.results)
        if (allDone) pushToast("info", t("allQuestionsFinished"))
        return
      }
      const doSubmit = () => {
        const startedAt = startedAtRef.current[question.id] ?? Date.now()
        const correct = evaluateQuestion(question, state.answers)
        const inWrongMode = page === "wrong"
        debugLog("Question submitted", {
          questionId: question.id,
          title: question.title,
          correct,
          elapsedMs: Date.now() - startedAt,
          answer: state.answers[question.id],
        })
        dispatch({ type: "SUBMIT_QUESTION", questionId: question.id, correct, inWrongMode })
        updateData((current) => ({
          ...current,
          attempts: [
            ...current.attempts,
            {
              id: createId(),
              listId: activeList.id,
              questionId: question.id,
              answer:
                state.answers[question.id] ??
                collectCompositeAnswer(question, state.answers),
              correct,
              elapsedMs: Math.max(1000, Date.now() - startedAt),
              submittedAt: new Date().toISOString(),
            },
          ],
        }))
        if (data.settings.revealMode === "end") {
          pushToast("info", t("submittedMsg"))
        } else {
          pushToast(correct ? "success" : "info", correct ? t("answerCorrect") : t("recordedAsWrong"))
        }
        // Auto-navigate after submit
        if (data.settings.autoNext) {
          if (data.settings.viewMode === "single") {
            const questionCount = practiceQuestions.length
            if (state.currentIndex < questionCount - 1) {
              window.setTimeout(() => {
                dispatch({
                  type: "NAVIGATE_FN",
                  updater: (idx) => Math.min(idx + 1, questionCount - 1),
                })
              }, 500)
            }
          } else if (data.settings.viewMode === "paper") {
            const questionIndex = practiceQuestions.findIndex((q) => q.id === question.id)
            if (questionIndex >= 0 && questionIndex < practiceQuestions.length - 1) {
              window.setTimeout(() => {
                document.getElementById(`question-${questionIndex + 1}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }, 500)
            }
          }
        }
      }
      if (isAnswerEmpty(question, state.answers)) {
        const idx = practiceQuestions.findIndex((q) => q.id === question.id)
        showConfirm(t("confirmEmptySubmit", idx + 1), doSubmit)
      } else {
        doSubmit()
      }
    },
    [state.answers, state.results, state.currentIndex, practiceQuestions, page, activeList.id, data.settings, pushToast, showConfirm, t, updateData, isAnswerEmpty],
  )

  const submitAll = useCallback(() => {
    const unsubmitted = practiceQuestions.filter((q) => !(q.id in state.results))
    if (!unsubmitted.length) return
    const emptyQuestions = unsubmitted.filter((q) => isAnswerEmpty(q, state.answers))
    const doSubmitAll = () => {
      debugLog("Submit all", {
        totalQuestions: practiceQuestions.length,
        unsubmittedCount: unsubmitted.length,
      })
      let correctCount = 0
      const newResults: Record<string, boolean> = {}
      const newAttempts: AppData["attempts"] = []
      for (const question of unsubmitted) {
        const startedAt = startedAtRef.current[question.id] ?? Date.now()
        const correct = evaluateQuestion(question, state.answers)
        newResults[question.id] = correct
        if (correct) correctCount++
        newAttempts.push({
          id: createId(),
          listId: activeList.id,
          questionId: question.id,
          answer:
            state.answers[question.id] ??
            collectCompositeAnswer(question, state.answers),
          correct,
          elapsedMs: Math.max(1000, Date.now() - startedAt),
          submittedAt: new Date().toISOString(),
        })
      }
      const inWrongMode = page === "wrong"
      dispatch({
        type: "SUBMIT_ALL",
        results: newResults,
        submittedCount: unsubmitted.length,
        correctCount,
        inWrongMode,
      })
      updateData((current) => ({
        ...current,
        attempts: [...current.attempts, ...newAttempts],
      }))
      pushToast("success", t("submitAllResult", unsubmitted.length, correctCount))
    }
    if (emptyQuestions.length) {
      const nums = emptyQuestions.map((q) => practiceQuestions.indexOf(q) + 1).join(", ")
      showConfirm(t("confirmEmptySubmitAll", nums), doSubmitAll)
    } else {
      doSubmitAll()
    }
  }, [state.answers, state.results, practiceQuestions, page, activeList.id, pushToast, showConfirm, t, updateData, isAnswerEmpty])

  const resetAll = useCallback(() => {
    dispatch({ type: "LIST_RESET_FULL" })
    startedAtRef.current = {}
  }, [])

  const value = useMemo(
    () => ({
      answers: state.answers,
      setAnswers,
      results: state.results,
      currentIndex: state.currentIndex,
      setCurrentIndex,
      startedAtRef,
      submitQuestion,
      submitAll,
      wrongSession: state.wrongSession,
      startWrongPractice,
      resetWrongPractice,
      exportWrongList,
      createWrongList,
      practiceQuestions,
      resetAll,
    }),
    [
      state.answers,
      setAnswers,
      state.results,
      state.currentIndex,
      setCurrentIndex,
      submitQuestion,
      submitAll,
      state.wrongSession,
      startWrongPractice,
      resetWrongPractice,
      exportWrongList,
      createWrongList,
      practiceQuestions,
      resetAll,
    ],
  )

  return <PracticeContext.Provider value={value}>{children}</PracticeContext.Provider>
}

export function usePracticeContext(): PracticeContextValue {
  const ctx = useContext(PracticeContext)
  if (!ctx) throw new Error("usePracticeContext must be used within PracticeProvider")
  return ctx
}
