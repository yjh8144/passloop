import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { AppData, Question } from "./lib/types"
import { getTranslator } from "./lib/i18n/index"
import {
  I18nProvider,
  ToastProvider,
  DialogProvider,
  useDialog,
  LlmConfigProvider,
  AppDataProvider,
  useAppData,
  useLlmConfig,
  usePushToast,
  NavigationProvider,
  useNavigation,
  useT,
} from "./contexts"
import { createDefaultData, downloadJson, loadData } from "./lib/storage"
import { debugLog, isDebugEnabled, setDebugEnabled } from "./lib/debug"
import { X } from "lucide-react"
import { ONBOARDING_KEY } from "./utils/constants"
import { useToast } from "./hooks/useToast"
import { usePractice } from "./hooks/usePractice"
import { useWrongPractice } from "./hooks/useWrongPractice"
import type { UseWrongPracticeReturn } from "./hooks/useWrongPractice"
import { useImportExport } from "./hooks/useImportExport"
import { ToastStack } from "./components/ui/ToastStack"
import { ResetConfirmDialog } from "./components/dialogs/ResetConfirmDialog"
import { OnboardingDialog } from "./components/dialogs/OnboardingDialog"
import { ImportSourceDialog } from "./components/dialogs/ImportSourceDialog"
import { ImportChoiceDialog } from "./components/dialogs/ImportChoiceDialog"
import { BackupImportDialog } from "./components/dialogs/BackupImportDialog"
import { Sidebar } from "./components/layout/Sidebar"
import { BottomNav } from "./components/layout/BottomNav"
import { Topbar } from "./components/layout/Topbar"
import { ManagerPage } from "./components/manager/ManagerPage"
import { LlmPage } from "./components/llm/LlmPage"
import { PracticePage } from "./components/practice/PracticePage"

export function App() {
  const [data, setData] = useState<AppData>(() => loadData())
  const t = useMemo(() => getTranslator(data.settings.language), [data.settings.language])
  const { toasts, pushToast } = useToast()

  return (
    <I18nProvider t={t}>
      <ToastProvider pushToast={pushToast}>
        <DialogProvider>
          <LlmConfigProvider>
            <AppDataProvider data={data} setData={setData}>
              <NavigationProvider>
                <AppShell toasts={toasts} />
              </NavigationProvider>
            </AppDataProvider>
          </LlmConfigProvider>
        </DialogProvider>
      </ToastProvider>
    </I18nProvider>
  )
}

function AppShell({ toasts }: { toasts: ReturnType<typeof useToast>["toasts"] }) {
  const {
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
    deleteList,
    clearActiveListAttempts,
    addImportedList,
    registerListResetCallback,
  } = useAppData()
  const { llmConfig, openLlmConfig, clearLlmConfig: clearLlmConfigCtx } = useLlmConfig()
  const { showConfirm } = useDialog()
  const pushToast = usePushToast()
  const {
    page,
    setPage,
    desktopSidebarCollapsed,
    llmUnsavedRef,
    registerWrongStart,
  } = useNavigation()
  const t = useT()

  const [editing, setEditing] = useState<Question | null>(null)
  const [resetConfirmDialog, setResetConfirmDialog] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem(ONBOARDING_KEY)
  })
  const [showDebugDialog, setShowDebugDialog] = useState(false)
  const [debugEnabled, setDebugState] = useState(() => isDebugEnabled())

  const toggleDebug = useCallback(() => {
    const next = !debugEnabled
    setDebugEnabled(next)
    setDebugState(next)
    debugLog(next ? "Debug mode enabled" : "Debug mode disabled")
    setShowDebugDialog(false)
  }, [debugEnabled])

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

  const importExport = useImportExport({
    t,
    llmConfig,
    pushToast,
    updateActiveList,
    updateData,
    data,
    setData,
  })

  useEffect(() => {
    registerListResetCallback((_questions, mode) => {
      if (mode === "full") {
        practice.setCurrentIndex(0)
        practice.setAnswers({})
        practice.setResults({})
        practice.startedAtRef.current = {}
        wrongPractice.setWrongSession(null)
      } else {
        practice.resetPracticeState(_questions)
        wrongPractice.setWrongSession(null)
        if (page === "wrong") setPage("practice")
      }
    })
  })

  const practiceQuestions = page === "wrong" ? wrongQuestions : displayedQuestions

  return (
    <div className={`app-shell ${desktopSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        onQuestionImport={() => importExport.setShowImportDialog(true)}
        onBackupImport={() => importExport.setShowBackupImportDialog(true)}
        onExportList={() => downloadJson(`${activeList.name}.json`, activeList)}
        onExportBackup={() => downloadJson("passloop-config.json", data)}
        onResetAll={() => setResetConfirmDialog(true)}
        onOpenDebugDialog={() => setShowDebugDialog(true)}
      />

      <main className="workspace">
        <Topbar
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
            list={activeList}
            updateList={updateActiveList}
            editing={editing}
            setEditing={setEditing}
            onDeleteList={() => deleteList(activeList.id)}
            llmConfig={llmConfig}
            onOpenLlmConfig={openLlmConfig}
          />
        ) : page === "llm" ? (
          <LlmPage
            activeList={activeList}
            updateActiveList={updateActiveList}
            addImportedList={addImportedList}
            unsavedRef={llmUnsavedRef}
            llmConfig={llmConfig}
            onOpenLlmConfig={openLlmConfig}
          />
        ) : (
          <PracticePage
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
        onQuestionImport={() => importExport.setShowImportDialog(true)}
        onBackupImport={() => importExport.setShowBackupImportDialog(true)}
        onExportList={() => downloadJson(`${activeList.name}.json`, activeList)}
        onExportBackup={() => downloadJson("passloop-config.json", data)}
        onResetAll={() => setResetConfirmDialog(true)}
      />

      <ToastStack toasts={toasts} />
      <ImportSourceDialog
        open={importExport.showImportDialog}
        onClose={() => importExport.setShowImportDialog(false)}
        onFileSelect={importExport.handleQuestionImport}
        onUrlImport={importExport.handleUrlImport}
      />
      <ImportSourceDialog
        open={importExport.showBackupImportDialog}
        onClose={() => importExport.setShowBackupImportDialog(false)}
        onFileSelect={importExport.handleBackupImport}
        onUrlImport={importExport.handleBackupUrlImport}
      />
      <ImportChoiceDialog
        lists={importExport.pendingImportLists}
        activeListName={activeList.name}
        onClose={() => importExport.setPendingImportLists(null)}
        onChoose={importExport.commitImport}
      />
      <BackupImportDialog
        data={importExport.pendingBackup}
        onClose={() => importExport.setPendingBackup(null)}
        onChoose={importExport.commitBackupImport}
      />
      <ResetConfirmDialog
        open={resetConfirmDialog}
        onClose={() => setResetConfirmDialog(false)}
        onConfirm={() => {
          debugLog("Reset all data")
          clearLlmConfigCtx()
          setData(createDefaultData())
          practice.setAnswers({})
          practice.setResults({})
          setResetConfirmDialog(false)
        }}
      />
      <OnboardingDialog
        open={showOnboarding}
        onClose={() => {
          localStorage.setItem(ONBOARDING_KEY, "1")
          setShowOnboarding(false)
        }}
      />
      {showDebugDialog && (
        <div className="modal-overlay" onClick={() => setShowDebugDialog(false)}>
          <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t("debugModeTitle")}</h2>
              <button className="icon-button" onClick={() => setShowDebugDialog(false)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: "8px 0 16px", lineHeight: 1.6 }}>
              {debugEnabled ? t("debugEnabledText") : t("debugDisabledText")}
            </p>
            <div className="modal-actions">
              <button onClick={() => setShowDebugDialog(false)}>{t("cancel")}</button>
              <button
                style={{
                  background: debugEnabled ? "var(--danger)" : "var(--accent)",
                  color: "#fff",
                  borderColor: debugEnabled ? "var(--danger)" : "var(--accent)",
                }}
                onClick={toggleDebug}
              >
                {debugEnabled ? t("disableDebugBtn") : t("enableDebugBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
