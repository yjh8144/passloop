import { useState } from "react"
import type { ChangeEvent } from "react"
import type { AppData, QuestionList, TFunc } from "../lib/types"
import { cloneQuestionsWithFreshIds, createId, parseQuestionJson } from "../lib/question"
import { normalizeAppData, readFileAsText } from "../lib/storage"
import { debugLog } from "../lib/debug"
import { fetchViaProxy } from "../lib/llm"
import { defaultProxySettings } from "../utils/constants"
import type { PushToast, UpdateActiveList, UpdateData, SetState, ImportCommitMode } from "./types"

function validateImportUrl(url: string, t: TFunc): string {
  const trimmed = url.trim()
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error(t("invalidUrlFormat"))
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(t("httpUrlOnly"))
  }
  const hostname = parsed.hostname.toLowerCase()
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error(t("localNetworkUrlBlocked"))
  }
  const m = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (m) {
    const [, a, b] = m.map(Number)
    if (
      a === 0 ||
      a === 127 ||
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    ) {
      throw new Error(t("privateNetworkUrlBlocked"))
    }
  }
  return trimmed
}

interface ProxyConfig {
  proxyEnabled: boolean
  proxyUrl: string
  proxyKey: string
}

function createQuestionClonePlan(lists: QuestionList[]) {
  const questions = lists.flatMap((list) => {
    const cloned = cloneQuestionsWithFreshIds(list.questions)
    return cloned.questions
  })
  return { questions }
}

interface UseImportExportParams {
  t: TFunc
  proxyConfig: ProxyConfig
  pushToast: PushToast
  updateActiveList: UpdateActiveList
  updateData: UpdateData
  data: AppData
  setData: SetState<AppData>
  initialDialog?: "question" | "backup"
}

export function useImportExport({
  t,
  proxyConfig,
  pushToast,
  updateActiveList,
  updateData,
  data,
  setData,
  initialDialog,
}: UseImportExportParams) {
  const [pendingImportLists, setPendingImportLists] = useState<QuestionList[] | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(initialDialog === "question")
  const [pendingBackup, setPendingBackup] = useState<AppData | null>(null)
  const [showBackupImportDialog, setShowBackupImportDialog] = useState(initialDialog === "backup")

  const handleQuestionImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    try {
      const lists = parseQuestionJson(await readFileAsText(file), t).map((l) => ({
        ...l,
        id: createId(),
      }))
      debugLog("Question import", {
        fileName: file.name,
        listCount: lists.length,
        totalQuestions: lists.reduce((sum, l) => sum + l.questions.length, 0),
      })
      setPendingImportLists(lists)
      setShowImportDialog(false)
    } catch (error) {
      debugLog("Question import failed", error)
      pushToast("error", error instanceof Error ? error.message : t("importFailed"))
    }
  }

  const handleUrlImport = async (url: string) => {
    let validatedUrl: string
    try {
      validatedUrl = validateImportUrl(url, t)
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : t("urlImportFailed"))
      return
    }
    const fetchProxyConfig = {
      proxyEnabled: proxyConfig.proxyEnabled,
      proxyUrl: proxyConfig.proxyEnabled
        ? proxyConfig.proxyUrl || defaultProxySettings.proxyUrl
        : "",
      proxyKey: proxyConfig.proxyEnabled ? proxyConfig.proxyKey : "",
    }
    try {
      const response = await fetchViaProxy(validatedUrl, fetchProxyConfig, undefined, t)
      const text = await response.text()
      const lists = parseQuestionJson(text, t).map((l) => ({ ...l, id: createId() }))
      debugLog("URL import", {
        url: validatedUrl,
        listCount: lists.length,
        totalQuestions: lists.reduce((sum, l) => sum + l.questions.length, 0),
      })
      setPendingImportLists(lists)
      setShowImportDialog(false)
    } catch (error) {
      debugLog("URL import failed", error)
      pushToast("error", error instanceof Error ? error.message : t("urlImportFailed"))
    }
  }

  const commitImport = (mode: ImportCommitMode) => {
    if (!pendingImportLists) return
    const { questions } = createQuestionClonePlan(pendingImportLists)
    if (mode === "current") {
      debugLog("Import to current list", { questionCount: questions.length })
      updateActiveList((list) => ({
        ...list,
        questions: [...list.questions, ...questions],
        updatedAt: new Date().toISOString(),
      }))
      pushToast("success", t("addedToCurrentList", questions.length))
    } else if (mode === "new") {
      const name =
        pendingImportLists.length === 1 ? pendingImportLists[0].name : t("importedListName")
      debugLog("Import as new list", { name, questionCount: questions.length })
      updateData((current) => {
        const newList: QuestionList = {
          id: createId(),
          name,
          description: "",
          questions,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        return { ...current, lists: [...current.lists, newList], activeListId: newList.id }
      })
      pushToast("success", t("createdNewList", name, questions.length))
    } else {
      const target = data.lists.find((l) => l.id === mode.listId)
      if (!target) {
        pushToast("error", t("importFailed"))
        setPendingImportLists(null)
        return
      }
      debugLog("Import to list", { listId: mode.listId, questionCount: questions.length })
      updateData((current) => ({
        ...current,
        lists: current.lists.map((l) =>
          l.id === mode.listId
            ? {
                ...l,
                questions: [...l.questions, ...questions],
                updatedAt: new Date().toISOString(),
              }
            : l,
        ),
      }))
      pushToast("success", t("addedToListName", questions.length, target.name))
    }
    setPendingImportLists(null)
  }

  const handleBackupImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    try {
      const imported = normalizeAppData(JSON.parse(await readFileAsText(file)))
      debugLog("Backup import parsed", {
        listCount: imported.lists.length,
        attemptCount: imported.attempts.length,
      })
      setPendingBackup(imported)
      setShowBackupImportDialog(false)
    } catch {
      pushToast("error", t("invalidBackupFile"))
    }
  }

  const handleBackupUrlImport = async (url: string) => {
    let validatedUrl: string
    try {
      validatedUrl = validateImportUrl(url, t)
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : t("urlBackupImportFailed"))
      return
    }
    const fetchProxyConfig = {
      proxyEnabled: proxyConfig.proxyEnabled,
      proxyUrl: proxyConfig.proxyEnabled
        ? proxyConfig.proxyUrl || defaultProxySettings.proxyUrl
        : "",
      proxyKey: proxyConfig.proxyEnabled ? proxyConfig.proxyKey : "",
    }
    try {
      const response = await fetchViaProxy(validatedUrl, fetchProxyConfig, undefined, t)
      const text = await response.text()
      const imported = normalizeAppData(JSON.parse(text))
      debugLog("Backup URL import parsed", {
        url: validatedUrl,
        listCount: imported.lists.length,
        attemptCount: imported.attempts.length,
      })
      setPendingBackup(imported)
      setShowBackupImportDialog(false)
    } catch (error) {
      debugLog("Backup URL import failed", error)
      pushToast("error", error instanceof Error ? error.message : t("urlBackupImportFailed"))
    }
  }

  const commitBackupImport = (mode: "overwrite" | "merge") => {
    if (!pendingBackup) return
    if (mode === "overwrite") {
      debugLog("Backup import: overwrite")
      setData(pendingBackup)
      pushToast("success", t("backupOverwritten"))
    } else {
      debugLog("Backup import: merge", {
        existingLists: data.lists.length,
        importedLists: pendingBackup.lists.length,
      })
      const existingIds = new Set(data.lists.map((l) => l.id))
      const existingQuestionIds = new Set(
        data.lists.flatMap((list) => list.questions.map((q) => q.id)),
      )
      const listIdRemap = new Map<string, string>()
      const questionIdRemap = new Map<string, string>()
      const newLists = pendingBackup.lists.map((list) => {
        const shouldRemapList = existingIds.has(list.id)
        const shouldRemapQuestions =
          shouldRemapList || list.questions.some((question) => existingQuestionIds.has(question.id))
        let nextList = list
        if (shouldRemapList) {
          const newId = createId()
          listIdRemap.set(list.id, newId)
          nextList = { ...nextList, id: newId }
        }
        if (shouldRemapQuestions) {
          const cloned = cloneQuestionsWithFreshIds(list.questions)
          for (const [oldId, newId] of cloned.questionIdMap) {
            questionIdRemap.set(`${list.id}\u0000${oldId}`, newId)
          }
          nextList = { ...nextList, questions: cloned.questions }
        }
        return nextList
      })
      const existingAttemptKeys = new Set(
        data.attempts.map((a) => `${a.listId}\u0000${a.questionId}\u0000${a.submittedAt}`),
      )
      const newAttempts = pendingBackup.attempts
        .map((attempt) => {
          const nextListId = listIdRemap.get(attempt.listId) ?? attempt.listId
          const nextQuestionId =
            questionIdRemap.get(`${attempt.listId}\u0000${attempt.questionId}`) ??
            attempt.questionId
          return { ...attempt, listId: nextListId, questionId: nextQuestionId }
        })
        .filter(
          (a) => !existingAttemptKeys.has(`${a.listId}\u0000${a.questionId}\u0000${a.submittedAt}`),
        )
      updateData((current) => ({
        ...current,
        lists: [...current.lists, ...newLists],
        attempts: [...current.attempts, ...newAttempts],
      }))
      pushToast("success", t("mergedLists", newLists.length))
    }
    setPendingBackup(null)
  }

  return {
    pendingImportLists,
    setPendingImportLists,
    pendingBackup,
    setPendingBackup,
    showImportDialog,
    setShowImportDialog,
    showBackupImportDialog,
    setShowBackupImportDialog,
    handleQuestionImport,
    handleUrlImport,
    commitImport,
    handleBackupImport,
    handleBackupUrlImport,
    commitBackupImport,
  }
}

export type UseImportExportReturn = ReturnType<typeof useImportExport>
