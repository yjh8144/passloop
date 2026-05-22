import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react"
import type { MutableRefObject, ReactNode } from "react"
import { useAppData } from "./AppDataContext"
import { useNavigation } from "./NavigationContext"
import { useDialog } from "./DialogContext"
import { usePushToast } from "./ToastContext"
import { useT } from "./I18nContext"
import { usePractice } from "../hooks/usePractice"
import { useWrongPractice } from "../hooks/useWrongPractice"
import type { UseWrongPracticeReturn } from "../hooks/useWrongPractice"
import type { WrongSession } from "../components/practice/WrongSessionPanel"
import type { Question } from "../lib/types"
import type { AnswerMap, ResultMap, SetState } from "../hooks/types"

interface PracticeContextValue {
  answers: AnswerMap
  setAnswers: SetState<AnswerMap>
  results: ResultMap
  setResults: SetState<ResultMap>
  currentIndex: number
  setCurrentIndex: SetState<number>
  startedAtRef: MutableRefObject<Record<string, number>>
  submitQuestion: (question: Question) => void
  submitAll: () => void
  resetPracticeState: (questions: Question[]) => void

  wrongSession: WrongSession | null
  setWrongSession: SetState<WrongSession | null>
  startWrongPractice: () => boolean
  resetWrongPractice: () => void
  exportWrongList: () => void
  createWrongList: () => void

  practiceQuestions: Question[]
  resetAll: () => void
}

const PracticeContext = createContext<PracticeContextValue | null>(null)

export function PracticeProvider({ children }: { children: ReactNode }) {
  const t = useT()
  const { page, setPage, registerWrongStart } = useNavigation()
  const {
    activeList,
    displayedQuestions,
    wrongQuestions,
    data,
    updateData,
    registerListResetCallback,
  } = useAppData()
  const { showConfirm } = useDialog()
  const pushToast = usePushToast()

  const wrongPracticeRef = useRef<UseWrongPracticeReturn>(null!)

  const practice = usePractice({
    t,
    page,
    activeList,
    displayedQuestions,
    wrongQuestions,
    settings: data.settings,
    pushToast,
    showConfirm,
    updateData,
    onSubmitInWrongMode: (submitted, correct) =>
      wrongPracticeRef.current.updateSessionOnSubmit(submitted, correct),
  })

  const wrongPractice = useWrongPractice({
    t,
    page,
    setPage,
    activeList,
    wrongQuestions,
    pushToast,
    updateData,
    resetPracticeState: practice.resetPracticeState,
    setCurrentIndex: practice.setCurrentIndex,
  })

  useEffect(() => {
    wrongPracticeRef.current = wrongPractice
  })

  useEffect(() => {
    registerWrongStart(() => wrongPractice.startWrongPractice())
  })

  useEffect(() => {
    registerListResetCallback((_questions, mode) => {
      if (mode === "full") {
        practice.setCurrentIndex(0)
        practice.setAnswers({})
        practice.setResults({})
        Object.keys(practice.startedAtRef.current).forEach(
          (key) => delete practice.startedAtRef.current[key],
        )
        wrongPractice.setWrongSession(null)
      } else {
        practice.resetPracticeState(_questions)
        wrongPractice.setWrongSession(null)
        if (page === "wrong") setPage("practice")
      }
    })
  })

  const practiceQuestions = page === "wrong" ? wrongQuestions : displayedQuestions

  const resetAll = useCallback(() => {
    practice.setCurrentIndex(0)
    practice.setAnswers({})
    practice.setResults({})
    Object.keys(practice.startedAtRef.current).forEach(
      (key) => delete practice.startedAtRef.current[key],
    )
    wrongPractice.setWrongSession(null)
  }, [practice, wrongPractice])

  const value = useMemo(
    () => ({
      answers: practice.answers,
      setAnswers: practice.setAnswers,
      results: practice.results,
      setResults: practice.setResults,
      currentIndex: practice.currentIndex,
      setCurrentIndex: practice.setCurrentIndex,
      startedAtRef: practice.startedAtRef,
      submitQuestion: practice.submitQuestion,
      submitAll: practice.submitAll,
      resetPracticeState: practice.resetPracticeState,
      wrongSession: wrongPractice.wrongSession,
      setWrongSession: wrongPractice.setWrongSession,
      startWrongPractice: wrongPractice.startWrongPractice,
      resetWrongPractice: wrongPractice.resetWrongPractice,
      exportWrongList: wrongPractice.exportWrongList,
      createWrongList: wrongPractice.createWrongList,
      practiceQuestions,
      resetAll,
    }),
    [
      practice.answers,
      practice.setAnswers,
      practice.results,
      practice.setResults,
      practice.currentIndex,
      practice.setCurrentIndex,
      practice.startedAtRef,
      practice.submitQuestion,
      practice.submitAll,
      practice.resetPracticeState,
      wrongPractice.wrongSession,
      wrongPractice.setWrongSession,
      wrongPractice.startWrongPractice,
      wrongPractice.resetWrongPractice,
      wrongPractice.exportWrongList,
      wrongPractice.createWrongList,
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
