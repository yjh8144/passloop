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
import { useDialog } from "./DialogContext"
import { usePushToast } from "./ToastContext"
import { useT } from "./I18nContext"
import { practiceReducer } from "../hooks/practiceReducer"
import type { PracticeState } from "../hooks/practiceReducer"
import { useSessionPersistence } from "../hooks/useSessionPersistence"
import { evaluateQuestion, hasUnsubmittedProgress } from "../utils/evaluate"
import { createId, normalizeImportedList } from "../lib/question"
import { downloadJson } from "../lib/storage"
import { debugLog } from "../lib/debug"
import { elapsedSince } from "../utils/time"
import {
  loadSessionAnswers,
  loadPosition,
  clearPosition,
  savePosition,
  loadSuppressEmptyConfirm,
  saveSuppressEmptyConfirm,
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
  submitQuestion: (question: Question, overrideAnswer?: string | string[]) => void
  submitAll: () => void

  practiceWrongList: () => void
  exportWrongList: () => void

  practiceQuestions: Question[]
  resetAll: () => void
}

const PracticeContext = createContext<PracticeContextValue | null>(null)

const AUTO_NEXT_PAUSE_MS = 500
const AUTO_NEXT_FAST_MS = 120

function createInitialState(): PracticeState {
  return {
    answers: loadSessionAnswers(),
    results: {},
    currentIndex: 0,
  }
}

export function PracticeProvider({ children }: { children: ReactNode }) {
  const t = useT()
  const {
    activeList,
    displayedQuestions,
    wrongQuestions,
    data,
    updateData,
    resetHandlerRef,
    query,
  } = useAppData()
  const { showConfirm } = useDialog()
  const pushToast = usePushToast()

  const [state, dispatch] = useReducer(practiceReducer, undefined, createInitialState)
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  const startedAtRef = useRef<Record<string, number>>({})
  const positionRestoredRef = useRef(false)
  const positionRestoredForListRef = useRef<string | null>(null)
  const autoNextTimerRef = useRef<number | null>(null)
  const clearAutoNextTimer = useCallback(() => {
    if (autoNextTimerRef.current !== null) {
      window.clearTimeout(autoNextTimerRef.current)
      autoNextTimerRef.current = null
    }
  }, [])
  useEffect(() => clearAutoNextTimer, [clearAutoNextTimer])

  // --- Persistence ---
  useSessionPersistence(state.answers, state.currentIndex)

  // --- Save position to localStorage (skip initial 0 before restore) ---
  useEffect(() => {
    if (positionRestoredRef.current && positionRestoredForListRef.current === activeList.id) {
      savePosition(activeList.id, state.currentIndex)
    }
  }, [state.currentIndex, activeList.id])

  // --- Restore results from localStorage attempts to prevent duplicate submissions ---
  // On list switch, reset state first, then restore from attempts in the same effect so the
  // reset doesn't wipe out the restored values (dispatch order is reduce order).
  const prevListIdRef = useRef(activeList.id)
  const preSearchIndexRef = useRef<number | null>(null)
  useEffect(() => {
    const isListSwitch = activeList.id !== prevListIdRef.current
    if (isListSwitch) {
      prevListIdRef.current = activeList.id
      dispatch({ type: "LIST_RESET_FULL" })
      startedAtRef.current = {}
      preSearchIndexRef.current = null
      clearAutoNextTimer()
    }
    const derived: Record<string, boolean> = {}
    const derivedAnswers: AnswerMap = {}
    const latestAt: Record<string, string> = {}
    // Restore the latest attempt per question by submission time, not array order,
    // so merged/imported attempts (appended out of order) restore correctly.
    for (const attempt of data.attempts) {
      if (attempt.listId !== activeList.id) continue
      const prevAt = latestAt[attempt.questionId]
      if (prevAt === undefined || attempt.submittedAt >= prevAt) {
        latestAt[attempt.questionId] = attempt.submittedAt
        derived[attempt.questionId] = attempt.correct
        derivedAnswers[attempt.questionId] = attempt.answer
      }
    }
    dispatch({ type: "RESTORE_RESULTS", results: derived })
    dispatch({ type: "RESTORE_ANSWERS", answers: derivedAnswers })
  }, [activeList.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- beforeunload warning for paper mode with unsubmitted answers ---
  useEffect(() => {
    if (data.settings.submitMode !== "paper") return
    if (!hasUnsubmittedProgress(state.answers, state.results)) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [data.settings.submitMode, state.answers, state.results])

  // --- Reset index when displayed questions change (search, sort) ---
  const prevQuestionsRef = useRef(displayedQuestions)
  const prevQueryRef = useRef(query)

  // Restore position on initial mount
  useEffect(() => {
    if (positionRestoredForListRef.current === null) {
      positionRestoredForListRef.current = activeList.id
      const saved = loadPosition(activeList.id)
      if (saved > 0) {
        const maxIndex = Math.max(displayedQuestions.length - 1, 0)
        dispatch({ type: "NAVIGATE", index: Math.min(saved, maxIndex) })
      }
      positionRestoredRef.current = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (query && !prevQueryRef.current) {
      preSearchIndexRef.current = stateRef.current.currentIndex
    } else if (!query && prevQueryRef.current && preSearchIndexRef.current !== null) {
      const maxIndex = displayedQuestions.length - 1
      dispatch({
        type: "NAVIGATE",
        index: Math.min(preSearchIndexRef.current, Math.max(maxIndex, 0)),
      })
      preSearchIndexRef.current = null
    }
    prevQueryRef.current = query
  }, [query, displayedQuestions.length])

  useEffect(() => {
    if (displayedQuestions !== prevQuestionsRef.current) {
      prevQuestionsRef.current = displayedQuestions
      if (positionRestoredForListRef.current !== activeList.id) {
        positionRestoredForListRef.current = activeList.id
        positionRestoredRef.current = true
        const saved = loadPosition(activeList.id)
        if (saved > 0) {
          const maxIndex = Math.max(displayedQuestions.length - 1, 0)
          dispatch({ type: "NAVIGATE", index: Math.min(saved, maxIndex) })
          return
        }
      }
      if (preSearchIndexRef.current === null) {
        dispatch({ type: "NAVIGATE", index: 0 })
      } else {
        dispatch({ type: "CLAMP_INDEX", maxIndex: Math.max(displayedQuestions.length - 1, 0) })
      }
    }
  }, [displayedQuestions, activeList.id])

  // --- Register reset handler for AppDataContext ---
  const handleListReset = useCallback(
    (mode: "full" | "selective", questionIds: string[]) => {
      clearAutoNextTimer()
      if (mode === "full") {
        dispatch({ type: "LIST_RESET_FULL" })
        startedAtRef.current = {}
        clearPosition(activeList.id)
      } else {
        dispatch({ type: "LIST_RESET_SELECTIVE", questionIds })
        for (const id of questionIds) delete startedAtRef.current[id]
      }
    },
    [activeList.id, clearAutoNextTimer],
  )
  useEffect(() => {
    resetHandlerRef.current = handleListReset
  })

  // --- Wrong question list actions ---
  const practiceQuestions = displayedQuestions

  const wrongListName = useCallback(() => {
    const suffix = t("wrongListSuffix", "").trim()
    let name = activeList.name
    while (suffix && name.endsWith(suffix)) {
      name = name.slice(0, -suffix.length).trim()
    }
    return t("wrongListSuffix", name)
  }, [activeList.name, t])

  const exportWrongList = useCallback(() => {
    if (!wrongQuestions.length) {
      pushToast("info", t("noWrongQuestions"))
      return
    }
    debugLog("Export wrong questions", { count: wrongQuestions.length, listName: activeList.name })
    const list = normalizeImportedList(
      {
        name: wrongListName(),
        description: t("wrongListExportDesc"),
        questions: wrongQuestions,
      },
      t,
    )
    downloadJson(`${list.name}.json`, list)
  }, [wrongQuestions, activeList.name, pushToast, t, wrongListName])

  const practiceWrongList = useCallback(() => {
    if (!wrongQuestions.length) {
      pushToast("info", t("noWrongQuestions"))
      return
    }
    debugLog("Create wrong practice list", { count: wrongQuestions.length, listName: activeList.name })
    const timestamp = new Date().toISOString()
    const newList = {
      id: createId(),
      name: wrongListName(),
      description: t("wrongListCreateDesc"),
      questions: wrongQuestions.map((q) => ({ ...q, id: createId() })),
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    updateData((current) => ({
      ...current,
      lists: [...current.lists, newList],
      activeListId: newList.id,
    }))
    pushToast("success", t("wrongListCreated", newList.name, wrongQuestions.length))
  }, [wrongQuestions, activeList.name, pushToast, t, updateData, wrongListName])

  const confirmPracticeWrongList = useCallback(() => {
    if (!wrongQuestions.length) {
      pushToast("info", t("noWrongQuestions"))
      return
    }
    showConfirm(t("confirmPracticeWrongList"), practiceWrongList)
  }, [wrongQuestions.length, showConfirm, t, practiceWrongList, pushToast])

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
    (question: Question, overrideAnswer?: string | string[]) => {
      const { results } = stateRef.current
      if (question.id in results) {
        const allDone =
          practiceQuestions.length > 0 && practiceQuestions.every((q) => q.id in results)
        if (allDone) pushToast("info", t("allQuestionsFinished"))
        return
      }
      const doSubmit = () => {
        const answers =
          overrideAnswer === undefined
            ? stateRef.current.answers
            : { ...stateRef.current.answers, [question.id]: overrideAnswer }
        const startedAt = startedAtRef.current[question.id] ?? Date.now()
        const correct = evaluateQuestion(question, answers)
        debugLog("Question submitted", {
          questionId: question.id,
          title: question.title,
          correct,
          elapsedMs: elapsedSince(startedAt),
          answer: answers[question.id],
        })
        dispatch({ type: "SUBMIT_QUESTION", questionId: question.id, correct })
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
              elapsedMs: elapsedSince(startedAt),
              submittedAt: new Date().toISOString(),
            },
          ],
        }))
        if (data.settings.autoNext) {
          const shouldAdvance = correct || data.settings.autoNextScope === "all"
          const delay = data.settings.autoNextPause ? AUTO_NEXT_PAUSE_MS : AUTO_NEXT_FAST_MS
          if (shouldAdvance && data.settings.viewMode === "single") {
            const questionCount = practiceQuestions.length
            const idx = stateRef.current.currentIndex
            if (idx < questionCount - 1) {
              clearAutoNextTimer()
              autoNextTimerRef.current = window.setTimeout(() => {
                autoNextTimerRef.current = null
                dispatch({
                  type: "NAVIGATE_FN",
                  updater: (i) => Math.min(i + 1, questionCount - 1),
                })
              }, delay)
            }
          } else if (shouldAdvance && data.settings.viewMode === "paper") {
            const questionIndex = practiceQuestions.findIndex((q) => q.id === question.id)
            if (questionIndex >= 0 && questionIndex < practiceQuestions.length - 1) {
              clearAutoNextTimer()
              autoNextTimerRef.current = window.setTimeout(() => {
                autoNextTimerRef.current = null
                dispatch({ type: "NAVIGATE", index: questionIndex + 1 })
              }, delay)
            }
          }
        }
      }
      if (overrideAnswer === undefined && isAnswerEmpty(question)) {
        if (loadSuppressEmptyConfirm()) {
          doSubmit()
          return
        }
        const idx = practiceQuestions.findIndex((q) => q.id === question.id)
        showConfirm(
          t("confirmEmptySubmit", idx + 1),
          (dontAskAgain) => {
            if (dontAskAgain) saveSuppressEmptyConfirm(true)
            doSubmit()
          },
          { dismissLabel: t("dontAskThisSession") },
        )
      } else {
        doSubmit()
      }
    },
    [
      practiceQuestions,
      activeList.id,
      data.settings,
      pushToast,
      showConfirm,
      t,
      updateData,
      isAnswerEmpty,
      clearAutoNextTimer,
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
          elapsedMs: elapsedSince(startedAt),
          submittedAt: new Date().toISOString(),
        })
      }
      dispatch({
        type: "SUBMIT_ALL",
        results: newResults,
      })
      updateData((current) => ({
        ...current,
        attempts: [...current.attempts, ...newAttempts],
      }))
      pushToast("success", t("submitAllResult", unsubmitted.length, correctCount))
    }
    if (emptyQuestions.length) {
      if (loadSuppressEmptyConfirm()) {
        doSubmitAll()
        return
      }
      const nums = emptyQuestions.map((q) => practiceQuestions.indexOf(q) + 1).join(", ")
      showConfirm(
        t("confirmEmptySubmitAll", nums),
        (dontAskAgain) => {
          if (dontAskAgain) saveSuppressEmptyConfirm(true)
          doSubmitAll()
        },
        { dismissLabel: t("dontAskThisSession") },
      )
    } else {
      doSubmitAll()
    }
  }, [practiceQuestions, activeList.id, pushToast, showConfirm, t, updateData, isAnswerEmpty])

  const resetAll = useCallback(() => {
    clearAutoNextTimer()
    dispatch({ type: "LIST_RESET_FULL" })
    startedAtRef.current = {}
    clearPosition(activeList.id)
  }, [activeList.id, clearAutoNextTimer])

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
      practiceWrongList: confirmPracticeWrongList,
      exportWrongList,
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
      confirmPracticeWrongList,
      exportWrongList,
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
