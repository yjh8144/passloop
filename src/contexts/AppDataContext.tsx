import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { MutableRefObject, ReactNode } from "react"
import type { AppData, Question, QuestionList } from "../lib/types"
import { getListStats, getTypeLabels, sortQuestions } from "../lib/question"
import { createEmptyQuestionList, saveData } from "../lib/storage"
import { debugLog } from "../lib/debug"
import { useDialog } from "./DialogContext"
import { usePushToast } from "./ToastContext"
import { useT } from "./I18nContext"

type UpdateData = (recipe: (draft: AppData) => AppData) => void
type UpdateActiveList = (recipe: (list: QuestionList) => QuestionList) => void

export type ListResetHandler = (mode: "full" | "selective", questionIds: string[]) => void

interface AppDataContextValue {
  data: AppData
  setData: React.Dispatch<React.SetStateAction<AppData>>
  activeList: QuestionList
  stats: ReturnType<typeof getListStats>
  displayedQuestions: Question[]
  wrongQuestions: Question[]
  query: string
  setQuery: React.Dispatch<React.SetStateAction<string>>
  updateData: UpdateData
  updateSettings: (patch: Partial<AppData["settings"]>) => void
  updateActiveList: UpdateActiveList
  createList: () => void
  deleteList: (id: string) => void
  clearActiveListAttempts: () => void
  addImportedList: (list: QuestionList) => void
  resetHandlerRef: MutableRefObject<ListResetHandler | null>
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({
  data,
  setData,
  children,
}: {
  data: AppData
  setData: React.Dispatch<React.SetStateAction<AppData>>
  children: ReactNode
}) {
  const t = useT()
  const { showConfirm, showPrompt } = useDialog()
  const pushToast = usePushToast()
  const [query, setQuery] = useState("")
  const resetHandlerRef = useRef<ListResetHandler | null>(null)

  const updateData: UpdateData = useCallback(
    (recipe) => setData((current) => recipe(current)),
    [setData],
  )

  const updateSettings = useCallback(
    (patch: Partial<AppData["settings"]>) => {
      debugLog("Settings updated", patch)
      updateData((current) => ({
        ...current,
        settings: { ...current.settings, ...patch },
      }))
    },
    [updateData],
  )

  const updateActiveList: UpdateActiveList = useCallback(
    (recipe) => {
      updateData((current) => ({
        ...current,
        lists: current.lists.map((list) =>
          list.id === current.activeListId ? recipe(list) : list,
        ),
      }))
    },
    [updateData],
  )

  const activeList = useMemo(
    () => data.lists.find((list) => list.id === data.activeListId) ?? data.lists[0],
    [data.activeListId, data.lists],
  )

  const stats = useMemo(() => getListStats(activeList, data.attempts), [activeList, data.attempts])

  const displayedQuestions = useMemo(() => {
    const labels = getTypeLabels(t)
    const sorted = sortQuestions(
      activeList.questions,
      data.settings.sortMode,
      data.settings.language,
      labels,
      data.settings.randomSeed,
    )
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return sorted
    return sorted.filter((question) =>
      [question.title, labels[question.type]].join(" ").toLowerCase().includes(trimmed),
    )
  }, [
    activeList.questions,
    data.settings.sortMode,
    data.settings.randomSeed,
    query,
    data.settings.language,
    t,
  ])

  const wrongQuestions = useMemo(
    () => activeList.questions.filter((question) => stats.wrongQuestionIds.has(question.id)),
    [activeList.questions, stats.wrongQuestionIds],
  )

  useEffect(() => saveData(data), [data])
  useEffect(() => {
    const body = document.body
    body.dataset.theme = data.settings.theme
    body.dataset.language = data.settings.language
  }, [data.settings.theme, data.settings.language])

  const createList = useCallback(() => {
    showPrompt(t("listNamePrompt"), t("defaultListName", data.lists.length + 1), (name) => {
      debugLog("Create list", { name })
      const list = createEmptyQuestionList(name)
      updateData((current) => ({
        ...current,
        lists: [...current.lists, list],
        activeListId: list.id,
      }))
      pushToast("success", t("listCreated", name))
    })
  }, [showPrompt, t, data.lists.length, updateData, pushToast])

  const deleteList = useCallback(
    (id: string) => {
      showConfirm(t("confirmDeleteList"), () => {
        debugLog("Delete list", { id })
        updateData((current) => {
          const remaining = current.lists.filter((list) => list.id !== id)
          const lists = remaining.length ? remaining : [createEmptyQuestionList(t("defaultList"))]
          return {
            ...current,
            lists,
            activeListId: current.activeListId === id ? lists[0].id : current.activeListId,
            attempts: current.attempts.filter((attempt) => attempt.listId !== id),
          }
        })
        resetHandlerRef.current?.("full", [])
        pushToast("success", t("listDeleted"))
      })
    },
    [showConfirm, t, updateData, pushToast],
  )

  const clearActiveListAttempts = useCallback(() => {
    showConfirm(t("confirmClearAttempts", activeList.name), () => {
      debugLog("Clear list attempts", { listId: activeList.id, listName: activeList.name })
      updateData((current) => ({
        ...current,
        attempts: current.attempts.filter((attempt) => attempt.listId !== activeList.id),
      }))
      const questionIds = activeList.questions.map((q) => q.id)
      resetHandlerRef.current?.("selective", questionIds)
      pushToast("success", t("attemptsCleared"))
    })
  }, [showConfirm, t, activeList, updateData, pushToast])

  const addImportedList = useCallback(
    (list: QuestionList) => {
      debugLog("Add imported list", { name: list.name, questionCount: list.questions.length })
      updateData((current) => ({
        ...current,
        lists: [...current.lists, list],
        activeListId: list.id,
      }))
      pushToast("success", t("importedToLocal"))
    },
    [updateData, pushToast, t],
  )

  const value = useMemo(
    () => ({
      data,
      setData,
      activeList,
      stats,
      displayedQuestions,
      wrongQuestions,
      query,
      setQuery,
      updateData,
      updateSettings,
      updateActiveList,
      createList,
      deleteList,
      clearActiveListAttempts,
      addImportedList,
      resetHandlerRef,
    }),
    [
      data,
      setData,
      activeList,
      stats,
      displayedQuestions,
      wrongQuestions,
      query,
      updateData,
      updateSettings,
      updateActiveList,
      createList,
      deleteList,
      clearActiveListAttempts,
      addImportedList,
    ],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider")
  return ctx
}
