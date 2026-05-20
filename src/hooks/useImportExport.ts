import { useState } from "react"
import type { ChangeEvent } from "react"
import type { AppData, LlmConfig, QuestionList } from "../lib/types"
import {
  createId,
  normalizeImportedList,
  parseQuestionJson,
} from "../lib/question"
import {
  downloadJson,
  normalizeAppData,
  readFileAsText,
} from "../lib/storage"
import { debugLog } from "../lib/debug"
import { defaultLlmConfig } from "../utils/constants"
import type { PushToast, UpdateActiveList, UpdateData, SetState } from "./types"

interface UseImportExportParams {
  llmConfig: LlmConfig
  pushToast: PushToast
  updateActiveList: UpdateActiveList
  updateData: UpdateData
  data: AppData
  setData: SetState<AppData>
}

export function useImportExport({
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
      pushToast("error", error instanceof Error ? error.message : "导入失败。")
    }
  }

  const handleUrlImport = async (url: string) => {
    const proxyUrl = llmConfig.proxyUrl || defaultLlmConfig.proxyUrl
    const proxyKey = llmConfig.proxyKey || defaultLlmConfig.proxyKey
    const fetchUrl = proxyUrl
      ? `${proxyUrl.replace(/\/+$/, "")}/?url=${encodeURIComponent(url)}`
      : url
    const headers: Record<string, string> = {}
    if (proxyUrl && proxyKey) {
      headers["X-Proxy-Key"] = proxyKey
    }
    try {
      const response = await fetch(fetchUrl, { headers })
      if (!response.ok) {
        throw new Error(`请求失败：${response.status}`)
      }
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
      pushToast("error", error instanceof Error ? error.message : "URL 导入失败。")
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
      pushToast("success", `已添加 ${questions.length} 道题到当前题单。`)
    } else {
      const name = pendingImportLists.length === 1 ? pendingImportLists[0].name : `导入题单`
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
      pushToast("success", `已创建新题单「${name}」，共 ${questions.length} 道题。`)
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
      pushToast("error", "文件不是有效的 PassLoop 配置数据。")
    }
  }

  const handleBackupUrlImport = async (url: string) => {
    const proxyUrl = llmConfig.proxyUrl || defaultLlmConfig.proxyUrl
    const proxyKey = llmConfig.proxyKey || defaultLlmConfig.proxyKey
    const fetchUrl = proxyUrl
      ? `${proxyUrl.replace(/\/+$/, "")}/?url=${encodeURIComponent(url)}`
      : url
    const headers: Record<string, string> = {}
    if (proxyUrl && proxyKey) {
      headers["X-Proxy-Key"] = proxyKey
    }
    try {
      const response = await fetch(fetchUrl, { headers })
      if (!response.ok) {
        throw new Error(`请求失败：${response.status}`)
      }
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
      pushToast("error", error instanceof Error ? error.message : "URL 导入配置失败。")
    }
  }

  const commitBackupImport = (mode: "overwrite" | "merge") => {
    if (!pendingBackup) return
    if (mode === "overwrite") {
      debugLog("Backup import: overwrite")
      setData(pendingBackup)
      pushToast("success", "配置已覆盖恢复。")
    } else {
      debugLog("Backup import: merge", {
        existingLists: data.lists.length,
        importedLists: pendingBackup.lists.length,
      })
      const existingIds = new Set(data.lists.map((l) => l.id))
      const newLists = pendingBackup.lists.map((l) =>
        existingIds.has(l.id) ? { ...l, id: createId() } : l,
      )
      const existingAttemptKeys = new Set(
        data.attempts.map((a) => `${a.questionId}-${a.submittedAt}`),
      )
      const newAttempts = pendingBackup.attempts.filter(
        (a) => !existingAttemptKeys.has(`${a.questionId}-${a.submittedAt}`),
      )
      updateData((current) => ({
        ...current,
        lists: [...current.lists, ...newLists],
        attempts: [...current.attempts, ...newAttempts],
      }))
      pushToast("success", `已合并 ${newLists.length} 个题单。`)
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
