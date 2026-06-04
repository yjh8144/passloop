import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import type { MutableRefObject, ReactNode } from "react"
import type { AppData, Question, QuestionList } from "../lib/types"
import { getListStats, getTypeLabels, sortQuestions } from "../lib/question"
import {
  createEmptyQuestionList,
  loadData,
  normalizeAppData,
  saveData,
  STORAGE_KEY,
} from "../lib/storage"
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
const APP_DATA_CHANNEL = "passloop.app-data.v1"

function sameJson(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function newerTimestamp(a?: string, b?: string): string {
  const aTime = Date.parse(a || "")
  const bTime = Date.parse(b || "")
  if (Number.isNaN(aTime)) return b || a || new Date().toISOString()
  if (Number.isNaN(bTime)) return a || b || new Date().toISOString()
  return aTime >= bTime ? (a ?? new Date().toISOString()) : (b ?? new Date().toISOString())
}

function pickField<T>(base: T, local: T, remote: T, localUpdatedAt?: string, remoteUpdatedAt?: string) {
  const localChanged = !sameJson(local, base)
  const remoteChanged = !sameJson(remote, base)
  if (localChanged && remoteChanged) {
    return newerTimestamp(localUpdatedAt, remoteUpdatedAt) === localUpdatedAt ? local : remote
  }
  if (localChanged) return local
  return remote
}

function mergeQuestion(
  base: Question | undefined,
  local: Question,
  remote: Question | undefined,
): Question {
  if (!remote || !base) return local
  return {
    ...remote,
    type: pickField(base.type, local.type, remote.type, local.updatedAt, remote.updatedAt),
    title: pickField(base.title, local.title, remote.title, local.updatedAt, remote.updatedAt),
    options: pickField(base.options, local.options, remote.options, local.updatedAt, remote.updatedAt),
    answer: pickField(base.answer, local.answer, remote.answer, local.updatedAt, remote.updatedAt),
    explanation: pickField(
      base.explanation,
      local.explanation,
      remote.explanation,
      local.updatedAt,
      remote.updatedAt,
    ),
    hint: pickField(base.hint, local.hint, remote.hint, local.updatedAt, remote.updatedAt),
    createdAt: base.createdAt || remote.createdAt || local.createdAt,
    updatedAt: newerTimestamp(local.updatedAt, remote.updatedAt),
  }
}

function mergeQuestions(base: Question[], local: Question[], remote: Question[]) {
  const baseById = new Map(base.map((question) => [question.id, question]))
  const localById = new Map(local.map((question) => [question.id, question]))
  const remoteById = new Map(remote.map((question) => [question.id, question]))
  const ids = new Set([...remoteById.keys(), ...localById.keys()])
  const merged: Question[] = []

  for (const id of ids) {
    const baseQuestion = baseById.get(id)
    const localQuestion = localById.get(id)
    const remoteQuestion = remoteById.get(id)
    if (baseQuestion && !localQuestion) continue
    if (baseQuestion && !remoteQuestion) {
      if (localQuestion && !sameJson(localQuestion, baseQuestion)) merged.push(localQuestion)
      continue
    }
    if (localQuestion) merged.push(mergeQuestion(baseQuestion, localQuestion, remoteQuestion))
    else if (remoteQuestion) merged.push(remoteQuestion)
  }

  return merged
}

function mergeList(
  base: QuestionList | undefined,
  local: QuestionList,
  remote: QuestionList | undefined,
): QuestionList {
  if (!remote || !base) return local
  return {
    ...remote,
    name: pickField(base.name, local.name, remote.name, local.updatedAt, remote.updatedAt),
    description: pickField(
      base.description,
      local.description,
      remote.description,
      local.updatedAt,
      remote.updatedAt,
    ),
    questions: mergeQuestions(base.questions, local.questions, remote.questions),
    createdAt: base.createdAt || remote.createdAt || local.createdAt,
    updatedAt: newerTimestamp(local.updatedAt, remote.updatedAt),
  }
}

function mergeLists(base: QuestionList[], local: QuestionList[], remote: QuestionList[]) {
  const baseById = new Map(base.map((list) => [list.id, list]))
  const localById = new Map(local.map((list) => [list.id, list]))
  const remoteById = new Map(remote.map((list) => [list.id, list]))
  const ids = new Set([...remoteById.keys(), ...localById.keys()])
  const merged: QuestionList[] = []

  for (const id of ids) {
    const baseList = baseById.get(id)
    const localList = localById.get(id)
    const remoteList = remoteById.get(id)
    if (baseList && !localList) continue
    if (baseList && !remoteList) {
      if (localList && !sameJson(localList, baseList)) merged.push(localList)
      continue
    }
    if (localList) merged.push(mergeList(baseList, localList, remoteList))
    else if (remoteList) merged.push(remoteList)
  }

  return merged.length ? merged : local
}

function mergeAppData(base: AppData, local: AppData, remote: AppData): AppData {
  if (sameJson(base, remote)) return local
  const lists = mergeLists(base.lists, local.lists, remote.lists)
  const settings = { ...remote.settings }
  for (const key of Object.keys(local.settings) as Array<keyof AppData["settings"]>) {
    settings[key] = pickField(base.settings[key], local.settings[key], remote.settings[key]) as never
  }
  const baseAttemptIds = new Set(base.attempts.map((attempt) => attempt.id))
  const remoteAttemptIds = new Set(remote.attempts.map((attempt) => attempt.id))
  const attempts = [
    ...remote.attempts,
    ...local.attempts.filter(
      (attempt) => !remoteAttemptIds.has(attempt.id) && !baseAttemptIds.has(attempt.id),
    ),
  ]
  const activeListId = lists.some((list) => list.id === local.activeListId)
    ? local.activeListId
    : lists.some((list) => list.id === remote.activeListId)
      ? remote.activeListId
      : lists[0].id
  return {
    version: 1,
    lists,
    activeListId,
    attempts,
    settings,
  }
}

export function AppDataProvider({
  data,
  setData: setRawData,
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
  const clientId = useId()
  const channelRef = useRef<BroadcastChannel | null>(null)
  const dataRef = useRef(data)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  const saveFailedRef = useRef(false)
  const commitData = useCallback(
    (next: AppData, base?: AppData) => {
      const latest = base && !saveFailedRef.current ? loadData() : null
      const nextData = base && latest ? mergeAppData(base, next, latest) : next
      dataRef.current = nextData
      setRawData(nextData)
      const ok = saveData(nextData)
      if (ok) {
        channelRef.current?.postMessage({ clientId, data: nextData })
      }
      if (!ok) {
        if (!saveFailedRef.current) {
          saveFailedRef.current = true
          pushToast("error", t("saveFailed"))
        }
      } else if (saveFailedRef.current) {
        saveFailedRef.current = false
      }
    },
    [clientId, pushToast, setRawData, t],
  )
  const getCommitBase = useCallback(() => {
    if (saveFailedRef.current) return dataRef.current
    return mergeAppData(dataRef.current, dataRef.current, loadData())
  }, [])

  const setData = useCallback<React.Dispatch<React.SetStateAction<AppData>>>(
    (action) => {
      const base = getCommitBase()
      const next = typeof action === "function" ? action(base) : action
      commitData(next, typeof action === "function" ? base : undefined)
    },
    [commitData, getCommitBase],
  )

  const updateData: UpdateData = useCallback(
    (recipe) => {
      const base = getCommitBase()
      commitData(recipe(base), base)
    },
    [commitData, getCommitBase],
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

  const activeList = useMemo(
    () => data.lists.find((list) => list.id === data.activeListId) ?? data.lists[0],
    [data.activeListId, data.lists],
  )

  const updateActiveList: UpdateActiveList = useCallback(
    (recipe) => {
      const targetListId = dataRef.current.activeListId
      updateData((current) => ({
        ...current,
        lists: current.lists.map((list) => (list.id === targetListId ? recipe(list) : list)),
      }))
    },
    [updateData],
  )

  const stats = useMemo(() => getListStats(activeList, data.attempts), [activeList, data.attempts])

  const displayedQuestions = useMemo(() => {
    const labels = getTypeLabels(t)
    const sorted = sortQuestions(
      activeList.questions,
      data.settings.sortMode,
      data.settings.language,
      data.settings.typeOrder,
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
    data.settings.typeOrder,
    data.settings.randomSeed,
    query,
    data.settings.language,
    t,
  ])

  const wrongQuestions = useMemo(
    () => activeList.questions.filter((question) => stats.wrongQuestionIds.has(question.id)),
    [activeList.questions, stats.wrongQuestionIds],
  )

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      try {
        const next = event.newValue ? normalizeAppData(JSON.parse(event.newValue)) : loadData()
        debugLog("App data synchronized from another tab", {
          listCount: next.lists.length,
          attemptCount: next.attempts.length,
        })
        dataRef.current = next
        setRawData(next)
      } catch (error) {
        debugLog("App data synchronization skipped invalid payload", error)
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [setRawData])

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return
    const channel = new BroadcastChannel(APP_DATA_CHANNEL)
    channelRef.current = channel
    channel.onmessage = (event: MessageEvent<{ clientId?: string; data?: unknown }>) => {
      if (event.data?.clientId === clientId) return
      const next = normalizeAppData(event.data?.data)
      debugLog("App data synchronized from broadcast", {
        listCount: next.lists.length,
        attemptCount: next.attempts.length,
      })
      dataRef.current = next
      setRawData(next)
    }
    return () => {
      channelRef.current = null
      channel.close()
    }
  }, [clientId, setRawData])
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
      showConfirm(
        t("confirmDeleteList"),
        () => {
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
        },
        { tone: "danger" },
      )
    },
    [showConfirm, t, updateData, pushToast],
  )

  const clearActiveListAttempts = useCallback(() => {
    showConfirm(
      t("confirmClearAttempts", activeList.name),
      () => {
        debugLog("Clear list attempts", { listId: activeList.id, listName: activeList.name })
        updateData((current) => ({
          ...current,
          attempts: current.attempts.filter((attempt) => attempt.listId !== activeList.id),
        }))
        const questionIds = activeList.questions.map((q) => q.id)
        resetHandlerRef.current?.("selective", questionIds)
        pushToast("success", t("attemptsCleared"))
      },
      { tone: "danger" },
    )
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
