import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react"
import type { MutableRefObject, ReactNode } from "react"
import { useAppData } from "./AppDataContext"
import { useNavigation } from "./NavigationContext"
import { useDialog } from "./DialogContext"
import { usePushToast } from "./ToastContext"
import { useT } from "./I18nContext"
import { practiceReducer } from "../hooks/practiceReducer"
import type { PracticeState, WrongSession } from "../hooks/practiceReducer"
import { evaluateQuestion, collectCompositeAnswer } from "../utils/evaluate"
import { createId, normalizeImportedList } from "../lib/question"
import { downloadJson } from "../lib/storage"
import { debugLog } from "../lib/debug"
import {
  loadSessionAnswers,
  saveSessionAnswers,
  loadSessionIndex,
  saveSessionIndex,
} from "../utils/session"
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
  const { page, setPage, registerWrongStart } = useNavigation()
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
  const stateRef = useRef(state)
  const pageRef = useRef(page)
  useEffect(() => { stateRef.current = state })
  useEffect(() => { pageRef.current = page })

  // Persistence
  useEffect(() => saveSessionAnswers(state.answers), [state.answers])
  useEffect(() => saveSessionIndex(state.currentIndex), [state.currentIndex])

  // Clamp index when question count changes
  const prevLength = useRef(displayedQuestions.length)
  useEffect(() => {
    if (displayedQuestions.length !== prevLength.current) {
      prevLength.current = displayedQuestions.length
      dispatch({ type: "CLAMP_INDEX", maxIndex: Math.max(displayedQuestions.length - 1, 0) })
    }
  }, [displayedQuestions.length])

  // List reset signal from AppDataContext
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
      if (pageRef.current === "wrong") setPage("practice")
    }
  }, [listResetSignal, setPage])

  // Wrong practice timer
  useEffect(() => {
    if (page !== "wrong" || !state.wrongSession?.id) return
    const startedAt = state.wrongSession.startedAt
    const intervalId = window.setInterval(() => {
      dispatch({
        type: "TICK_TIMER",
        elapsedSeconds: Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
      })
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [page, state.wrongSession?.id, state.wrongSession?.startedAt])

  // Restart wrong practice when activeList changes while on wrong page
  const prevActiveListId = useRef(activeList.id)
  const startWrongRef = useRef<() => boolean>(() => false)
  useEffect(() => {
    if (activeList.id === prevActiveListId.current) {
      prevActiveListId.current = activeList.id
      return
    }
    prevActiveListId.current = activeList.id
    if (pageRef.current === "wrong") {
      startWrongRef.current()
    }
  }, [activeList.id])

  // --- Action creators ---

  const practiceQuestions = page === "wrong" ? wrongQuestions : displayedQuestions

  const setCurrentIndex: SetState<number> = useCallback((v) => {
    const next = typeof v === "function" ? v(stateRef.current.currentIndex) : v
    dispatch({ type: "NAVIGATE", index: next })
  }, [])

  const setAnswers: SetState<AnswerMap> = useCallback((v) => {
    const next = typeof v === "function" ? v(stateRef.current.answers) : v
    dispatch({ type: "SET_ANSWERS", answers: next })
  }, [])

  const isAnswerEmpty = useCallback((question: Question): boolean => {
    const answers = stateRef.current.answers
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
      const currentState = stateRef.current
      if (question.id in currentState.results) {
        const questions = pageRef.current === "wrong" ? wrongQuestions : displayedQuestions
        const allDone = questions.length > 0 && questions.every((q) => q.id in currentState.results)
        if (allDone) pushToast("info", t("allQuestionsFinished"))
        return
      }
      const doSubmit = () => {
        const startedAt = startedAtRef.current[question.id] ?? Date.now()
        const correct = evaluateQuestion(question, currentState.answers)
        const inWrongMode = pageRef.current === "wrong"
        debugLog("Question submitted", {
          questionId: question.id,
          title: question.title,
          correct,
          elapsedMs: Date.now() - startedAt,
          answer: currentState.answers[question.id],
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
                currentState.answers[question.id] ??
                collectCompositeAnswer(question, currentState.answers),
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
        if (data.settings.autoNext) {
          const questions = pageRef.current === "wrong" ? wrongQuestions : displayedQuestions
          if (data.settings.viewMode === "single") {
            const questionCount = questions.length
            if (currentState.currentIndex < questionCount - 1) {
              window.setTimeout(
                () => {
                  const idx = stateRef.current.currentIndex
                  dispatch({ type: "NAVIGATE", index: Math.min(idx + 1, questionCount - 1) })
                },
                500,
              )
            }
          } else if (data.settings.viewMode === "paper") {
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
        const questions = pageRef.current === "wrong" ? wrongQuestions : displayedQuestions
        const idx = questions.findIndex((q) => q.id === question.id)
        showConfirm(t("confirmEmptySubmit", idx + 1), doSubmit)
      } else {
        doSubmit()
      }
    },
    [t, activeList, displayedQuestions, wrongQuestions, data.settings, pushToast, showConfirm, updateData, isAnswerEmpty],
  )

  const submitAll = useCallback(() => {
    const currentState = stateRef.current
    const questions = pageRef.current === "wrong" ? wrongQuestions : displayedQuestions
    const unsubmitted = questions.filter((q) => !(q.id in currentState.results))
    if (!unsubmitted.length) return
    const emptyQuestions = unsubmitted.filter((q) => isAnswerEmpty(q))
    const doSubmitAll = () => {
      debugLog("Submit all", {
        totalQuestions: questions.length,
        unsubmittedCount: unsubmitted.length,
      })
      let correctCount = 0
      const newResults: Record<string, boolean> = {}
      const newAttempts: AppData["attempts"] = []
      for (const question of unsubmitted) {
        const startedAt = startedAtRef.current[question.id] ?? Date.now()
        const correct = evaluateQuestion(question, currentState.answers)
        newResults[question.id] = correct
        if (correct) correctCount++
        newAttempts.push({
          id: createId(),
          listId: activeList.id,
          questionId: question.id,
          answer:
            currentState.answers[question.id] ??
            collectCompositeAnswer(question, currentState.answers),
          correct,
          elapsedMs: Math.max(1000, Date.now() - startedAt),
          submittedAt: new Date().toISOString(),
        })
      }
      const inWrongMode = pageRef.current === "wrong"
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
      const nums = emptyQuestions.map((q) => questions.indexOf(q) + 1).join(", ")
      showConfirm(t("confirmEmptySubmitAll", nums), doSubmitAll)
    } else {
      doSubmitAll()
    }
  }, [t, activeList, displayedQuestions, wrongQuestions, pushToast, showConfirm, updateData, isAnswerEmpty])

  function startWrongPracticeInner(): boolean {
    if (!wrongQuestions.length) {
      pushToast("info", t("noWrongQuestions"))
      return false
    }
    debugLog("Wrong practice started", {
      questionCount: wrongQuestions.length,
      listId: activeList.id,
    })
    const questionIds = wrongQuestions.flatMap((q) => [q.id, ...q.subQuestions.map((sq) => sq.id)])
    dispatch({
      type: "START_WRONG_PRACTICE",
      sessionId: createId(),
      startedAt: Date.now(),
      questionIds,
    })
    for (const id of questionIds) delete startedAtRef.current[id]
    setPage("wrong")
    return true
  }

  useEffect(() => { startWrongRef.current = startWrongPracticeInner })

  const startWrongPractice = useCallback((): boolean => {
    return startWrongRef.current()
  }, [])

  const resetWrongPractice = useCallback(() => {
    startWrongRef.current()
  }, [])

  const exportWrongList = useCallback(() => {
    if (!wrongQuestions.length) {
      pushToast("info", t("noWrongQuestions"))
      return
    }
    debugLog("Export wrong questions", { count: wrongQuestions.length, listName: activeList.name })
    const list = normalizeImportedList({
      name: t("wrongListSuffix", activeList.name),
      description: t("wrongListExportDesc"),
      questions: wrongQuestions,
    })
    downloadJson(`${list.name}.json`, list)
  }, [wrongQuestions, activeList.name, pushToast, t])

  const createWrongList = useCallback(() => {
    if (!wrongQuestions.length) {
      pushToast("info", t("noWrongQuestions"))
      return
    }
    const newList = {
      id: createId(),
      name: t("wrongListSuffix", activeList.name),
      description: t("wrongListCreateDesc"),
      questions: wrongQuestions.map((q) => ({ ...q, id: createId() })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    updateData((current) => ({
      ...current,
      lists: [...current.lists, newList],
      activeListId: newList.id,
    }))
    pushToast("success", t("wrongListCreated", newList.name, wrongQuestions.length))
  }, [wrongQuestions, activeList.name, pushToast, t, updateData])

  const resetAll = useCallback(() => {
    dispatch({ type: "LIST_RESET_FULL" })
    startedAtRef.current = {}
  }, [])

  // Register wrong practice start with NavigationContext
  useEffect(() => {
    registerWrongStart(() => startWrongRef.current())
  })

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
