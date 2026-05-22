import { useState } from "react"
import type { ChangeEvent } from "react"
import type { AppData, LlmConfig, QuestionList, TFunc } from "../lib/types"
import {
  createId,
  parseQuestionJson,
} from "../lib/question"
import {
  normalizeAppData,
  readFileAsText,
} from "../lib/storage"
import { debugLog } from "../lib/debug"
import { fetchViaProxy } from "../lib/llm"
import { defaultLlmConfig } from "../utils/constants"
import type { PushToast, UpdateActiveList, UpdateData, SetState } from "./types"

interface UseImportExportParams {
  t: TFunc
  llmConfig: LlmConfig
  pushToast: PushToast
  updateActiveList: UpdateActiveList
  updateData: UpdateData
  data: AppData
  setData: SetState<AppData>
}

export function useImportExport({
  t,
  llmConfig,
  pushToast,
  updateActiveList,
  updateData,
  data,
  setData,
}: UseImportExportParams) {
  const [pendingImportLists, setPendingImportLists] = useState<QuestionList[] | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [pendingBackup, setPendingBackup] = useState<AppData | null>(null)
  const [showBackupImportDialog, setShowBackupImportDialog] = useState(false)

  const handleQuestionImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    try {
      const lists = parseQuestionJson(await readFileAsText(file)).map((l) => ({
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
    const proxyConfig = {
      proxyEnabled: llmConfig.proxyEnabled !== false,
      proxyUrl: (llmConfig.proxyEnabled !== false) ? (llmConfig.proxyUrl || defaultLlmConfig.proxyUrl) : "",
      proxyKey: (llmConfig.proxyEnabled !== false) ? (llmConfig.proxyKey || defaultLlmConfig.proxyKey) : "",
    }
    try {
      const response = await fetchViaProxy(url, proxyConfig)
      const text = await response.text()
      const lists = parseQuestionJson(text).map((l) => ({ ...l, id: createId() }))
      debugLog("URL import", {
        url,
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

  const commitImport = (mode: "current" | "new") => {
    if (!pendingImportLists) return
    const questions = pendingImportLists
      .flatMap((l) => l.questions)
      .map((q) => ({ ...q, id: createId() }))
    if (mode === "current") {
      debugLog("Import to current list", { questionCount: questions.length })
      updateActiveList((list) => ({
        ...list,
        questions: [...list.questions, ...questions],
        updatedAt: new Date().toISOString(),
      }))
      pushToast("success", t("addedToCurrentList", questions.length))
    } else {
      const name = pendingImportLists.length === 1 ? pendingImportLists[0].name : t("importedListName")
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
    const proxyConfig = {
      proxyEnabled: llmConfig.proxyEnabled !== false,
      proxyUrl: (llmConfig.proxyEnabled !== false) ? (llmConfig.proxyUrl || defaultLlmConfig.proxyUrl) : "",
      proxyKey: (llmConfig.proxyEnabled !== false) ? (llmConfig.proxyKey || defaultLlmConfig.proxyKey) : "",
    }
    try {
      const response = await fetchViaProxy(url, proxyConfig)
      const text = await response.text()
      const imported = normalizeAppData(JSON.parse(text))
      debugLog("Backup URL import parsed", {
        url,
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
      const idRemap = new Map<string, string>()
      const newLists = pendingBackup.lists.map((l) => {
        if (existingIds.has(l.id)) {
          const newId = createId()
          idRemap.set(l.id, newId)
          return { ...l, id: newId }
        }
        return l
      })
      const existingAttemptKeys = new Set(
        data.attempts.map((a) => `${a.questionId}-${a.submittedAt}`),
      )
      const newAttempts = pendingBackup.attempts
        .filter((a) => !existingAttemptKeys.has(`${a.questionId}-${a.submittedAt}`))
        .map((a) => (idRemap.has(a.listId) ? { ...a, listId: idRemap.get(a.listId)! } : a))
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
