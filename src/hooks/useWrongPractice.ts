import { useEffect, useState } from "react"
import type { Question, QuestionList } from "../lib/types"
import { createId, normalizeImportedList } from "../lib/question"
import { downloadJson } from "../lib/storage"
import { debugLog } from "../lib/debug"
import type { Page, PushToast, SetState, UpdateData } from "./types"
import type { WrongSession } from "../components/practice/WrongSessionPanel"

interface UseWrongPracticeParams {
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

  useEffect(() => {
    if (page !== "wrong" || !wrongSession) return
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
  }, [page, wrongSession?.id])

  useEffect(() => {
    if (page === "wrong") startWrongPractice()
  }, [activeList.id])

  const startWrongPractice = () => {
    if (!wrongQuestions.length) {
      pushToast("info", "当前题单还没有错题。")
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

  const resetWrongPractice = () => {
    startWrongPractice()
  }

  const exportWrongList = () => {
    if (!wrongQuestions.length) {
      pushToast("info", "当前题单还没有错题。")
      return
    }
    debugLog("Export wrong questions", { count: wrongQuestions.length, listName: activeList.name })
    const list = normalizeImportedList({
      name: `${activeList.name} - 错题`,
      description: "由 PassLoop 根据答题记录导出的错题题单。",
      questions: wrongQuestions,
    })
    downloadJson(`${list.name}.json`, list)
  }

  const createWrongList = () => {
    if (!wrongQuestions.length) {
      pushToast("info", "当前题单还没有错题。")
      return
    }
    const newList: QuestionList = {
      id: createId(),
      name: `${activeList.name} - 错题`,
      description: "由 PassLoop 根据答题记录生成的错题题单。",
      questions: wrongQuestions.map((q) => ({ ...q, id: createId() })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    updateData((current) => ({
      ...current,
      lists: [...current.lists, newList],
      activeListId: newList.id,
    }))
    pushToast("success", `已生成错题题单「${newList.name}」，共 ${wrongQuestions.length} 题。`)
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
