import { lazy, Suspense, useCallback, useEffect, useState } from "react"
import type { AppData, Question } from "./lib/types"
import { getTranslator, loadTranslator } from "./lib/i18n/index"
import {
  I18nProvider,
  ToastProvider,
  DialogProvider,
  ProxyProvider,
  LlmConfigProvider,
  AppDataProvider,
  useAppData,
  useLlmConfig,
  useProxy,
  NavigationProvider,
  useNavigation,
  PracticeProvider,
  usePracticeContext,
  useDialog,
  useT,
} from "./contexts"
import { createDefaultData, downloadJson, loadData } from "./lib/storage"
import { createPracticeQuestionKey, createTestQuestionList } from "./lib/question"
import { hasUnsubmittedProgressForKeys } from "./utils/evaluate"
import { debugLog } from "./lib/debug"
import { ONBOARDING_KEY } from "./utils/constants"
import { safeGetStorageItem, safeSetStorageItem } from "./utils/safeStorage"
import { useToast } from "./hooks/useToast"
import { ToastStack } from "./components/ui/ToastStack"
import { ResetConfirmDialog } from "./components/dialogs/ResetConfirmDialog"
import { OnboardingDialog } from "./components/dialogs/OnboardingDialog"
import { DebugDialog } from "./components/dialogs/DebugDialog"
import { Sidebar } from "./components/layout/Sidebar"
import { BottomNav } from "./components/layout/BottomNav"
import { Topbar } from "./components/layout/Topbar"
import { PracticePage } from "./components/practice/PracticePage"

const ManagerPage = lazy(() =>
  import("./components/manager/ManagerPage").then((module) => ({ default: module.ManagerPage })),
)
const LlmPage = lazy(() =>
  import("./components/llm/LlmPage").then((module) => ({ default: module.LlmPage })),
)
const SettingsPage = lazy(() =>
  import("./components/settings/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
)
const ImportExportDialogs = lazy(() =>
  import("./components/dialogs/ImportExportDialogs").then((module) => ({
    default: module.ImportExportDialogs,
  })),
)
const OfflineDialog = lazy(() =>
  import("./components/dialogs/OfflineDialog").then((module) => ({
    default: module.OfflineDialog,
  })),
)

type ImportExportDialogKind = "question" | "backup" | "remote"

export function App() {
  const [data, setData] = useState<AppData>(() => loadData())
  const [translatorState, setTranslatorState] = useState(() => ({
    language: "zh" as AppData["settings"]["language"],
    t: getTranslator("zh"),
  }))
  const { toasts, pushToast } = useToast()

  useEffect(() => {
    let cancelled = false
    loadTranslator(data.settings.language).then((translator) => {
      if (!cancelled) {
        setTranslatorState({ language: data.settings.language, t: translator })
      }
    })
    return () => {
      cancelled = true
    }
  }, [data.settings.language])

  if (translatorState.language !== data.settings.language) {
    return <PageLoading />
  }

  return (
    <I18nProvider t={translatorState.t}>
      <ToastProvider pushToast={pushToast}>
        <DialogProvider>
          <ProxyProvider>
            <LlmConfigProvider>
              <AppDataProvider data={data} setData={setData}>
                <NavigationProvider>
                  <AppShell toasts={toasts} />
                </NavigationProvider>
              </AppDataProvider>
            </LlmConfigProvider>
          </ProxyProvider>
        </DialogProvider>
      </ToastProvider>
    </I18nProvider>
  )
}

function AppShell({ toasts }: { toasts: ReturnType<typeof useToast>["toasts"] }) {
  const { data, setData, activeList, updateActiveList, deleteList, addImportedList } = useAppData()
  const { clearLlmConfig: clearLlmConfigCtx } = useLlmConfig()
  const { resetProxySettings } = useProxy()
  const { page, desktopSidebarCollapsed, llmUnsavedRef } = useNavigation()
  const { showConfirm } = useDialog()
  const t = useT()

  const [editing, setEditing] = useState<Question | null>(null)
  const [resetConfirmDialog, setResetConfirmDialog] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !safeGetStorageItem("local", ONBOARDING_KEY)
  })
  const [showDebugDialog, setShowDebugDialog] = useState(false)
  const [showOfflineDialog, setShowOfflineDialog] = useState(false)
  const [importDialog, setImportDialog] = useState<ImportExportDialogKind | null>(null)
  const handleExportBackup = useCallback(() => {
    showConfirm(t("confirmExportBackup"), () => downloadJson("passloop-config.json", data))
  }, [data, showConfirm, t])

  return (
    <PracticeProvider>
      <div className={`app-shell ${desktopSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <Sidebar onOpenDebugDialog={() => setShowDebugDialog(true)} />

        <main className="workspace">
          <TopbarConnected />

          <Suspense fallback={<PageLoading />}>
            {page === "manager" ? (
              <ManagerPage
                list={activeList}
                updateList={updateActiveList}
                editing={editing}
                setEditing={setEditing}
                onDeleteList={() => deleteList(activeList.id)}
              />
            ) : page === "llm" ? (
              <LlmPage
                activeList={activeList}
                updateActiveList={updateActiveList}
                addImportedList={addImportedList}
                unsavedRef={llmUnsavedRef}
              />
            ) : page === "settings" ? (
              <SettingsPage
                onQuestionImport={() => setImportDialog("question")}
                onBackupImport={() => setImportDialog("backup")}
                onRemoteBackup={() => setImportDialog("remote")}
                onExportList={() => downloadJson(`${activeList.name}.json`, activeList)}
                onExportBackup={handleExportBackup}
                onResetAll={() => setResetConfirmDialog(true)}
                onOpenOfflineDialog={() => setShowOfflineDialog(true)}
              />
            ) : (
              <PracticePage />
            )}
          </Suspense>

          <footer className="app-footer">
            © 2026{" "}
            <a href="https://github.com/yjh8144" target="_blank" rel="noopener noreferrer">
              yjh8144
            </a>
            . All rights reserved. <span className="app-version">v{__APP_VERSION__}</span>
          </footer>
        </main>

        <BottomNav />

        <ToastStack toasts={toasts} />
        {importDialog && (
          <Suspense fallback={null}>
            <ImportExportDialogs
              initialDialog={importDialog}
              onDone={() => setImportDialog(null)}
            />
          </Suspense>
        )}
        <ResetConfirmConnected
          open={resetConfirmDialog}
          onClose={() => setResetConfirmDialog(false)}
          onResetData={() => {
            clearLlmConfigCtx()
            resetProxySettings()
            setData(createDefaultData())
          }}
        />
        <OnboardingDialog
          open={showOnboarding}
          onClose={() => {
            safeSetStorageItem("local", ONBOARDING_KEY, "1")
            setShowOnboarding(false)
          }}
        />
        <DebugDialog
          open={showDebugDialog}
          onClose={() => setShowDebugDialog(false)}
          onShowOnboarding={() => setShowOnboarding(true)}
          onCreateTestList={() => addImportedList(createTestQuestionList(t))}
        />
        {showOfflineDialog && (
          <Suspense fallback={null}>
            <OfflineDialog open={showOfflineDialog} onClose={() => setShowOfflineDialog(false)} />
          </Suspense>
        )}
      </div>
    </PracticeProvider>
  )
}

function PageLoading() {
  return <div className="route-loading" aria-live="polite" />
}

function TopbarConnected() {
  const {
    data,
    setData,
    activeList,
    createList,
    deleteList,
    query,
    setQuery,
    updateSettings,
    clearActiveListAttempts,
  } = useAppData()
  const { page } = useNavigation()
  const { answers, results } = usePracticeContext()
  const { showConfirm } = useDialog()
  const t = useT()

  const hasAttempts = data.attempts.some((a) => a.listId === activeList.id)

  const changeActiveList = useCallback(
    (id: string) => {
      if (id === data.activeListId) return
      debugLog("Switch active list", { from: data.activeListId, to: id })
      // Only warn about losing progress for genuinely unsubmitted, non-empty answers.
      // (answers also holds values restored from past attempts, which are already saved.)
      const activeQuestionKeys = activeList.questions.map((question) =>
        createPracticeQuestionKey(activeList.id, question.id),
      )
      if (hasUnsubmittedProgressForKeys(answers, results, activeQuestionKeys)) {
        showConfirm(t("confirmSwitchList"), () => {
          setData((current) => ({ ...current, activeListId: id }))
        })
      } else {
        setData((current) => ({ ...current, activeListId: id }))
      }
    },
    [data.activeListId, activeList, answers, results, showConfirm, t, setData],
  )

  return (
    <Topbar
      page={page}
      query={query}
      setQuery={setQuery}
      data={data}
      updateSettings={updateSettings}
      activeList={activeList}
      lists={data.lists}
      setActiveListId={changeActiveList}
      createList={createList}
      deleteList={deleteList}
      onClearListAttempts={clearActiveListAttempts}
      hasAttempts={hasAttempts}
    />
  )
}

function ResetConfirmConnected({
  open,
  onClose,
  onResetData,
}: {
  open: boolean
  onClose: () => void
  onResetData: () => void
}) {
  const { resetAll } = usePracticeContext()
  return (
    <ResetConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={() => {
        debugLog("Reset all data")
        onResetData()
        resetAll()
        onClose()
      }}
    />
  )
}
