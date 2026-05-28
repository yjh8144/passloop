import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react"
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
import { evaluateQuestion } from "../utils/evaluate"
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
  paperScrollLockRef: MutableRefObject<number>
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
  const { activeList, displayedQuestions, wrongQuestions, data, updateData, resetHandlerRef, query } =
    useAppData()
  const { showConfirm } = useDialog()
  const pushToast = usePushToast()

  const [state, dispatch] = useReducer(practiceReducer, undefined, createInitialState)
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  const startedAtRef = useRef<Record<string, number>>({})
  const paperScrollLockRef = useRef<number>(0)

  // --- Persistence ---
  useSessionPersistence(state.answers, state.currentIndex)

  // --- Reset when switching lists ---
  const prevListIdRef = useRef(activeList.id)
  useEffect(() => {
    if (activeList.id !== prevListIdRef.current) {
      prevListIdRef.current = activeList.id
      dispatch({ type: "LIST_RESET_FULL" })
      startedAtRef.current = {}
      preSearchIndexRef.current = null
    }
  }, [activeList.id])

  // --- Reset index when displayed questions change (search, sort) ---
  const prevQuestionsRef = useRef(displayedQuestions)
  const preSearchIndexRef = useRef<number | null>(null)
  const prevQueryRef = useRef(query)

  useEffect(() => {
    if (query && !prevQueryRef.current) {
      preSearchIndexRef.current = stateRef.current.currentIndex
    } else if (!query && prevQueryRef.current && preSearchIndexRef.current !== null) {
      const maxIndex = displayedQuestions.length - 1
      dispatch({ type: "NAVIGATE", index: Math.min(preSearchIndexRef.current, Math.max(maxIndex, 0)) })
      preSearchIndexRef.current = null
    }
    prevQueryRef.current = query
  }, [query, displayedQuestions.length])

  useEffect(() => {
    if (displayedQuestions !== prevQuestionsRef.current) {
      prevQuestionsRef.current = displayedQuestions
      if (preSearchIndexRef.current === null) {
        dispatch({ type: "NAVIGATE", index: 0 })
      } else {
        dispatch({ type: "CLAMP_INDEX", maxIndex: Math.max(displayedQuestions.length - 1, 0) })
      }
    }
  }, [displayedQuestions])

  // --- Register reset handler for AppDataContext ---
  const pageRef = useRef(page)
  useEffect(() => {
    pageRef.current = page
  })

  const handleListReset = useCallback(
    (mode: "full" | "selective", questionIds: string[]) => {
      if (mode === "full") {
        dispatch({ type: "LIST_RESET_FULL" })
        startedAtRef.current = {}
      } else {
        dispatch({ type: "LIST_RESET_SELECTIVE", questionIds })
        for (const id of questionIds) delete startedAtRef.current[id]
        if (pageRef.current === "wrong") setPage("practice")
      }
    },
    [setPage],
  )
  useEffect(() => {
    resetHandlerRef.current = handleListReset
  })

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
      showConfirm,
    })

  const confirmStartWrongPractice = useCallback((): boolean => {
    if (!wrongQuestions.length) {
      pushToast("info", t("noWrongQuestions"))
      return false
    }
    showConfirm(t("confirmRedoWrong"), () => startWrongPractice())
    return true
  }, [wrongQuestions.length, showConfirm, t, startWrongPractice, pushToast])

  const confirmResetWrongPractice = useCallback(() => {
    if (!wrongQuestions.length) {
      resetWrongPractice()
      return
    }
    showConfirm(t("confirmRedoWrong"), resetWrongPractice)
  }, [wrongQuestions.length, showConfirm, t, resetWrongPractice])

  // When page transitions to "wrong" via NavigationContext, initialize wrong practice
  // if not already active. If start fails (no wrong questions), revert to practice.
  useEffect(() => {
    if (page === "wrong" && !state.wrongSession) {
      if (!wrongQuestions.length) {
        pushToast("info", t("noWrongQuestions"))
        setPage("practice")
        return
      }
      const questionIds = wrongQuestions.map((q) => q.id)
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
  const isAnswerEmpty = useCallback((question: Question): boolean => {
    const answers = stateRef.current.answers
    const val = answers[question.id]
    if (val === undefined || val === null) return true
    if (Array.isArray(val)) return val.length === 0 || val.every((s) => !s.trim())
    return typeof val === "string" && !val.trim()
  }, [])

  const submitQuestion = useCallback(
    (question: Question) => {
      const { results } = stateRef.current
      if (question.id in results) {
        const allDone =
          practiceQuestions.length > 0 && practiceQuestions.every((q) => q.id in results)
        if (allDone) pushToast("info", t("allQuestionsFinished"))
        return
      }
      const doSubmit = () => {
        const { answers } = stateRef.current
        const startedAt = startedAtRef.current[question.id] ?? Date.now()
        const correct = evaluateQuestion(question, answers)
        const inWrongMode = page === "wrong"
        debugLog("Question submitted", {
          questionId: question.id,
          title: question.title,
          correct,
          elapsedMs: Date.now() - startedAt,
          answer: answers[question.id],
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
              answer: answers[question.id] ?? "",
              correct,
              elapsedMs: Math.max(1000, Date.now() - startedAt),
              submittedAt: new Date().toISOString(),
            },
          ],
        }))
        if (data.settings.autoNext) {
          if (data.settings.viewMode === "single") {
            const questionCount = practiceQuestions.length
            const idx = stateRef.current.currentIndex
            if (idx < questionCount - 1) {
              window.setTimeout(() => {
                dispatch({
                  type: "NAVIGATE_FN",
                  updater: (i) => Math.min(i + 1, questionCount - 1),
                })
              }, 500)
            }
          } else if (data.settings.viewMode === "paper") {
            const questionIndex = practiceQuestions.findIndex((q) => q.id === question.id)
            if (questionIndex >= 0 && questionIndex < practiceQuestions.length - 1) {
              window.setTimeout(() => {
                dispatch({ type: "NAVIGATE", index: questionIndex + 1 })
              }, 500)
            }
          }
        }
      }
      if (isAnswerEmpty(question)) {
        const idx = practiceQuestions.findIndex((q) => q.id === question.id)
        showConfirm(t("confirmEmptySubmit", idx + 1), doSubmit)
      } else {
        doSubmit()
      }
    },
    [
      practiceQuestions,
      page,
      activeList.id,
      data.settings,
      pushToast,
      showConfirm,
      t,
      updateData,
      isAnswerEmpty,
    ],
  )

  const submitAll = useCallback(() => {
    const { results } = stateRef.current
    const unsubmitted = practiceQuestions.filter((q) => !(q.id in results))
    if (!unsubmitted.length) return
    const emptyQuestions = unsubmitted.filter((q) => isAnswerEmpty(q))
    const doSubmitAll = () => {
      const { answers } = stateRef.current
      debugLog("Submit all", {
        totalQuestions: practiceQuestions.length,
        unsubmittedCount: unsubmitted.length,
      })
      let correctCount = 0
      const newResults: Record<string, boolean> = {}
      const newAttempts: AppData["attempts"] = []
      for (const question of unsubmitted) {
        const startedAt = startedAtRef.current[question.id] ?? Date.now()
        const correct = evaluateQuestion(question, answers)
        newResults[question.id] = correct
        if (correct) correctCount++
        newAttempts.push({
          id: createId(),
          listId: activeList.id,
          questionId: question.id,
          answer: answers[question.id] ?? "",
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
  }, [practiceQuestions, page, activeList.id, pushToast, showConfirm, t, updateData, isAnswerEmpty])

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
      paperScrollLockRef,
      submitQuestion,
      submitAll,
      wrongSession: state.wrongSession,
      startWrongPractice: confirmStartWrongPractice,
      resetWrongPractice: confirmResetWrongPractice,
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
      confirmStartWrongPractice,
      confirmResetWrongPractice,
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
