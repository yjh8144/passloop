import { useEffect, useRef, useState } from "react"
import type { Question, QuestionList, TFunc } from "../lib/types"
import { createId, normalizeImportedList } from "../lib/question"
import { downloadJson } from "../lib/storage"
import { debugLog } from "../lib/debug"
import type { Page, PushToast, SetState, UpdateData } from "./types"
import type { WrongSession } from "../components/practice/WrongSessionPanel"

interface UseWrongPracticeParams {
  t: TFunc
  page: Page
  setPage: SetState<Page>
  activeList: QuestionList
  wrongQuestions: Question[]
  pushToast: PushToast
  updateData: UpdateData
  resetPracticeState: (questions: Question[]) => void
  setCurrentIndex: SetState<number>
}

export function useWrongPractice({
  t,
  page,
  setPage,
  activeList,
  wrongQuestions,
  pushToast,
  updateData,
  resetPracticeState,
  setCurrentIndex,
}: UseWrongPracticeParams) {
  const [wrongSession, setWrongSession] = useState<WrongSession | null>(null)
  const wrongSessionId = wrongSession?.id
  const pageRef = useRef(page)
  useEffect(() => {
    pageRef.current = page
  })

  useEffect(() => {
    if (page !== "wrong" || !wrongSessionId) return
    const intervalId = window.setInterval(() => {
      setWrongSession((session) =>
        session
          ? {
              ...session,
              elapsedSeconds: Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000)),
            }
          : session,
      )
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [page, wrongSessionId])

  const startWrongPractice = () => {
    if (!wrongQuestions.length) {
      pushToast("info", t("noWrongQuestions"))
      return false
    }
    debugLog("Wrong practice started", {
      questionCount: wrongQuestions.length,
      listId: activeList.id,
    })
    const startedAt = Date.now()
    setWrongSession({
      id: createId(),
      startedAt,
      elapsedSeconds: 0,
      submitted: 0,
      correct: 0,
    })
    setPage("wrong")
    setCurrentIndex(0)
    resetPracticeState(wrongQuestions)
    return true
  }

  const startWrongPracticeRef = useRef(startWrongPractice)
  useEffect(() => {
    startWrongPracticeRef.current = startWrongPractice
  })

  useEffect(() => {
    if (pageRef.current === "wrong") startWrongPracticeRef.current()
  }, [activeList.id])

  const resetWrongPractice = () => {
    startWrongPractice()
  }

  const exportWrongList = () => {
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
  }

  const createWrongList = () => {
    if (!wrongQuestions.length) {
      pushToast("info", t("noWrongQuestions"))
      return
    }
    const newList: QuestionList = {
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
  }

  const updateSessionOnSubmit = (submitted: number, correct: number) => {
    setWrongSession((session) =>
      session
        ? {
            ...session,
            elapsedSeconds: Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000)),
            submitted: session.submitted + submitted,
            correct: session.correct + correct,
          }
        : session,
    )
  }

  return {
    wrongSession,
    setWrongSession,
    startWrongPractice,
    resetWrongPractice,
    exportWrongList,
    createWrongList,
    updateSessionOnSubmit,
  }
}

export type UseWrongPracticeReturn = ReturnType<typeof useWrongPractice>
