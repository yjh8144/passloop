import { useEffect, useMemo, useRef, useState } from "react"
import type { AppData, LlmConfig, Question, QuestionList } from "./lib/types"
import { getTranslator } from "./lib/i18n/index"
import {
  clearLlmConfig,
  createDefaultData,
  createEmptyQuestionList,
  downloadJson,
  loadData,
  loadLlmConfig,
  saveLlmConfig,
  saveData,
} from "./lib/storage"
import { createId, getListStats, getTypeLabels, sortQuestions } from "./lib/question"
import { debugLog } from "./lib/debug"
import { defaultLlmConfig, ONBOARDING_KEY } from "./utils/constants"
import { useToast } from "./hooks/useToast"
import { usePractice } from "./hooks/usePractice"
import { useWrongPractice } from "./hooks/useWrongPractice"
import type { UseWrongPracticeReturn } from "./hooks/useWrongPractice"
import { useImportExport } from "./hooks/useImportExport"
import type { Page } from "./hooks/types"
import { ToastStack } from "./components/ui/ToastStack"
import { ResetConfirmDialog } from "./components/dialogs/ResetConfirmDialog"
import { OnboardingDialog } from "./components/dialogs/OnboardingDialog"
import { ConfirmDialog, PromptDialog } from "./components/dialogs/ConfirmDialog"
import type { ConfirmDialogState, PromptDialogState } from "./components/dialogs/ConfirmDialog"
import { ImportSourceDialog } from "./components/dialogs/ImportSourceDialog"
import { ImportChoiceDialog } from "./components/dialogs/ImportChoiceDialog"
import { BackupImportDialog } from "./components/dialogs/BackupImportDialog"
import { Sidebar } from "./components/layout/Sidebar"
import { BottomNav } from "./components/layout/BottomNav"
import { Topbar } from "./components/layout/Topbar"
import { ManagerPage } from "./components/manager/ManagerPage"
import { LlmConfigModal } from "./components/llm/LlmConfigModal"
import { LlmPage } from "./components/llm/LlmPage"
import { PracticePage } from "./components/practice/PracticePage"

export function App() {
  const [data, setData] = useState<AppData>(() => loadData())
  const [page, setPage] = useState<Page>("practice")
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<Question | null>(null)
  const { toasts, pushToast } = useToast()
  const [mobileSidebarCollapsed, setMobileSidebarCollapsed] = useState(false)
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null)
  const [promptDialog, setPromptDialog] = useState<PromptDialogState>(null)
  const [resetConfirmDialog, setResetConfirmDialog] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem(ONBOARDING_KEY)
  })
  const [llmConfig, setLlmConfig] = useState<LlmConfig>(() => loadLlmConfig(defaultLlmConfig))
  const [showGlobalLlmConfig, setShowGlobalLlmConfig] = useState(false)
  const llmUnsavedRef = useRef(false)
  const t = getTranslator(data.settings.language)

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ message, onConfirm })
  }

  const showPrompt = (title: string, defaultValue: string, onSubmit: (value: string) => void) => {
    setPromptDialog({ title, defaultValue, onSubmit })
  }

  const updateData = (recipe: (draft: AppData) => AppData) => {
    setData((current) => recipe(current))
  }

  const updateSettings = (patch: Partial<AppData["settings"]>) => {
    debugLog("Settings updated", patch)
    updateData((current) => ({
      ...current,
      settings: { ...current.settings, ...patch },
    }))
  }

  const updateActiveList = (recipe: (list: QuestionList) => QuestionList) => {
    updateData((current) => ({
      ...current,
      lists: current.lists.map((list) => (list.id === current.activeListId ? recipe(list) : list)),
    }))
  }

  const activeList = useMemo(
    () => data.lists.find((list) => list.id === data.activeListId) ?? data.lists[0],
    [data.activeListId, data.lists],
  )

  const stats = useMemo(() => getListStats(activeList, data.attempts), [activeList, data.attempts])


  const displayedQuestions = useMemo(() => {
    const sorted = sortQuestions(activeList.questions, data.settings.sortMode)
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return sorted
    const labels = getTypeLabels(t)
    return sorted.filter((question) =>
      [question.title, question.prompt, labels[question.type]]
        .join(" ")
        .toLowerCase()
        .includes(trimmed),
    )
  }, [activeList.questions, data.settings.sortMode, query, data.settings.language])

  const wrongQuestions = useMemo(
    () => activeList.questions.filter((question) => stats.wrongQuestionIds.has(question.id)),
    [activeList.questions, stats.wrongQuestionIds],
  )

  useEffect(() => saveData(data), [data])
  useEffect(() => saveLlmConfig(llmConfig), [llmConfig])
  useEffect(() => {
    const body = document.body
    body.dataset.theme = data.settings.theme
    body.dataset.language = data.settings.language
  }, [data.settings.theme, data.settings.language])

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
  wrongPracticeRef.current = wrongPractice

  const importExport = useImportExport({
    t,
    llmConfig,
    pushToast,
    updateActiveList,
    updateData,
    data,
    setData,
  })

  const changePage = (nextPage: Page) => {
    debugLog("Page changed", { from: page, to: nextPage })
    if (page === "llm" && nextPage !== "llm" && llmUnsavedRef.current) {
      showConfirm(t("confirmLeaveLlm"), () => {
        llmUnsavedRef.current = false
        if (nextPage === "wrong") {
          wrongPractice.startWrongPractice()
        } else {
          setPage(nextPage)
        }
      })
      return
    }
    if (nextPage === "wrong") {
      wrongPractice.startWrongPractice()
      return
    }
    setPage(nextPage)
  }

  const createList = () => {
    showPrompt(t("listNamePrompt"), t("defaultListName", data.lists.length + 1), (name) => {
      debugLog("Create list", { name })
      const list = createEmptyQuestionList(name)
      updateData((current) => ({
        ...current,
        lists: [...current.lists, list],
        activeListId: list.id,
      }))
    })
  }

  const deleteList = (id: string) => {
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
      practice.setCurrentIndex(0)
      practice.setAnswers({})
      practice.setResults({})
      practice.startedAtRef.current = {}
      wrongPractice.setWrongSession(null)
      pushToast("success", t("listDeleted"))
    })
  }

  const clearActiveListAttempts = () => {
    showConfirm(t("confirmClearAttempts", activeList.name), () => {
      debugLog("Clear list attempts", { listId: activeList.id, listName: activeList.name })
      updateData((current) => ({
        ...current,
        attempts: current.attempts.filter((attempt) => attempt.listId !== activeList.id),
      }))
      practice.resetPracticeState(activeList.questions)
      wrongPractice.setWrongSession(null)
      if (page === "wrong") setPage("practice")
      pushToast("success", t("attemptsCleared"))
    })
  }

  const addImportedList = (list: QuestionList) => {
    debugLog("Add imported list", { name: list.name, questionCount: list.questions.length })
    updateData((current) => ({
      ...current,
      lists: [...current.lists, list],
      activeListId: list.id,
    }))
    pushToast("success", t("importedToLocal"))
  }

  const practiceQuestions = page === "wrong" ? wrongQuestions : displayedQuestions

  return (
    <div className={`app-shell ${desktopSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        t={t}
        page={page}
        setPage={changePage}
        data={data}
        activeList={activeList}
        setData={setData}
        createList={createList}
        onQuestionImport={() => importExport.setShowImportDialog(true)}
        onBackupImport={() => importExport.setShowBackupImportDialog(true)}
        onExportList={() => downloadJson(`${activeList.name}.json`, activeList)}
        onExportBackup={() => downloadJson("passloop-config.json", data)}
        onResetAll={() => setResetConfirmDialog(true)}
        onOpenLlmConfig={() => setShowGlobalLlmConfig(true)}
        collapsed={mobileSidebarCollapsed}
        onToggleCollapsed={() => setMobileSidebarCollapsed((collapsed) => !collapsed)}
        desktopCollapsed={desktopSidebarCollapsed}
        onToggleDesktopCollapsed={() => setDesktopSidebarCollapsed((c) => !c)}
      />

      <main className="workspace">
        <Topbar
          t={t}
          page={page}
          query={query}
          setQuery={setQuery}
          data={data}
          updateSettings={updateSettings}
          activeList={activeList}
          onRedoWrong={wrongPractice.resetWrongPractice}
          onExportWrong={wrongPractice.exportWrongList}
          onCreateWrongList={wrongPractice.createWrongList}
          onClearListAttempts={clearActiveListAttempts}
        />

        {page === "manager" ? (
          <ManagerPage
            t={t}
            list={activeList}
            updateList={updateActiveList}
            editing={editing}
            setEditing={setEditing}
            pushToast={pushToast}
            showConfirm={showConfirm}
            showPrompt={showPrompt}
            onDeleteList={() => deleteList(activeList.id)}
            llmConfig={llmConfig}
            onOpenLlmConfig={() => setShowGlobalLlmConfig(true)}
          />
        ) : page === "llm" ? (
          <LlmPage
            t={t}
            activeList={activeList}
            updateActiveList={updateActiveList}
            addImportedList={addImportedList}
            pushToast={pushToast}
            unsavedRef={llmUnsavedRef}
            llmConfig={llmConfig}
            onOpenLlmConfig={() => setShowGlobalLlmConfig(true)}
          />
        ) : (
          <PracticePage
            t={t}
            mode={page}
            questions={practiceQuestions}
            currentIndex={practice.currentIndex}
            setCurrentIndex={practice.setCurrentIndex}
            answers={practice.answers}
            setAnswers={practice.setAnswers}
            results={practice.results}
            submitQuestion={practice.submitQuestion}
            submitAll={practice.submitAll}
            settings={data.settings}
            updateSettings={updateSettings}
            stats={stats}
            wrongSession={page === "wrong" ? wrongPractice.wrongSession : null}
            onRedoWrong={wrongPractice.resetWrongPractice}
            onExportWrong={wrongPractice.exportWrongList}
            onCreateWrongList={wrongPractice.createWrongList}
            onClearListAttempts={clearActiveListAttempts}
            startedAtRef={practice.startedAtRef}
          />
        )}
      </main>

      <BottomNav
        t={t}
        page={page}
        setPage={changePage}
        data={data}
        activeList={activeList}
        setData={setData}
        createList={createList}
        onQuestionImport={() => importExport.setShowImportDialog(true)}
        onBackupImport={() => importExport.setShowBackupImportDialog(true)}
        onExportList={() => downloadJson(`${activeList.name}.json`, activeList)}
        onExportBackup={() => downloadJson("passloop-config.json", data)}
        onResetAll={() => setResetConfirmDialog(true)}
        onOpenLlmConfig={() => setShowGlobalLlmConfig(true)}
      />

      <ToastStack toasts={toasts} />
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(null)} t={t} />
      <PromptDialog state={promptDialog} onClose={() => setPromptDialog(null)} t={t} />
      <ImportSourceDialog
        open={importExport.showImportDialog}
        onClose={() => importExport.setShowImportDialog(false)}
        onFileSelect={importExport.handleQuestionImport}
        onUrlImport={importExport.handleUrlImport}
        t={t}
      />
      <ImportSourceDialog
        open={importExport.showBackupImportDialog}
        onClose={() => importExport.setShowBackupImportDialog(false)}
        onFileSelect={importExport.handleBackupImport}
        onUrlImport={importExport.handleBackupUrlImport}
        t={t}
      />
      <ImportChoiceDialog
        lists={importExport.pendingImportLists}
        activeListName={activeList.name}
        onClose={() => importExport.setPendingImportLists(null)}
        onChoose={importExport.commitImport}
        t={t}
      />
      <BackupImportDialog
        data={importExport.pendingBackup}
        onClose={() => importExport.setPendingBackup(null)}
        onChoose={importExport.commitBackupImport}
        t={t}
      />
      <ResetConfirmDialog
        open={resetConfirmDialog}
        onClose={() => setResetConfirmDialog(false)}
        onConfirm={() => {
          debugLog("Reset all data")
          clearLlmConfig()
          setData(createDefaultData())
          practice.setAnswers({})
          practice.setResults({})
          setResetConfirmDialog(false)
        }}
        t={t}
      />
      <OnboardingDialog
        open={showOnboarding}
        onClose={() => {
          localStorage.setItem(ONBOARDING_KEY, "1")
          setShowOnboarding(false)
        }}
        t={t}
      />
      <LlmConfigModal
        open={showGlobalLlmConfig}
        onClose={() => setShowGlobalLlmConfig(false)}
        config={llmConfig}
        setConfig={setLlmConfig}
        pushToast={pushToast}
        t={t}
      />
    </div>
  )
}
