import { useCallback, useEffect, useRef } from "react"
import type { Dispatch, MutableRefObject } from "react"
import type { PracticeAction, WrongSession } from "./practiceReducer"
import type { Page, PushToast, UpdateData } from "./types"
import type { Question, QuestionList, TFunc } from "../lib/types"
import { createId, normalizeImportedList } from "../lib/question"
import { downloadJson } from "../lib/storage"
import { debugLog } from "../lib/debug"

interface UseWrongPracticeParams {
  dispatch: Dispatch<PracticeAction>
  wrongQuestions: Question[]
  wrongSession: WrongSession | null
  page: Page
  setPage: (page: Page) => void
  activeList: QuestionList
  updateData: UpdateData
  pushToast: PushToast
  startedAtRef: MutableRefObject<Record<string, number>>
  t: TFunc
}

export function useWrongPractice({
  dispatch,
  wrongQuestions,
  wrongSession,
  page,
  setPage,
  activeList,
  updateData,
  pushToast,
  startedAtRef,
  t,
}: UseWrongPracticeParams) {
  // Timer
  useEffect(() => {
    if (page !== "wrong" || !wrongSession?.id) return
    const startedAt = wrongSession.startedAt
    const intervalId = window.setInterval(() => {
      dispatch({
        type: "TICK_TIMER",
        elapsedSeconds: Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
      })
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [page, wrongSession?.id, wrongSession?.startedAt, dispatch])

  const doStart = useCallback((): boolean => {
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
    return true
  }, [wrongQuestions, activeList.id, dispatch, pushToast, startedAtRef, t])

  // Restart wrong practice when activeList changes while on wrong page
  const prevActiveListId = useRef(activeList.id)
  useEffect(() => {
    if (activeList.id === prevActiveListId.current) {
      prevActiveListId.current = activeList.id
      return
    }
    prevActiveListId.current = activeList.id
    if (page === "wrong") {
      doStart()
    }
  }, [activeList.id, page, doStart])

  const startWrongPractice = useCallback((): boolean => {
    const started = doStart()
    if (started) setPage("wrong")
    return started
  }, [doStart, setPage])

  const resetWrongPractice = useCallback(() => {
    doStart()
  }, [doStart])

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

  return { startWrongPractice, resetWrongPractice, exportWrongList, createWrongList }
}
