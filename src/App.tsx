import { useCallback, useMemo, useState } from "react"
import type { AppData, Question } from "./lib/types"
import { getTranslator } from "./lib/i18n/index"
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
import { createTestQuestionList } from "./lib/question"
import { debugLog } from "./lib/debug"
import { ONBOARDING_KEY } from "./utils/constants"
import { useToast } from "./hooks/useToast"
import { ToastStack } from "./components/ui/ToastStack"
import { ResetConfirmDialog } from "./components/dialogs/ResetConfirmDialog"
import { OnboardingDialog } from "./components/dialogs/OnboardingDialog"
import { DebugDialog } from "./components/dialogs/DebugDialog"
import { OfflineDialog } from "./components/dialogs/OfflineDialog"
import { ImportExportDialogs } from "./components/dialogs/ImportExportDialogs"
import type { ImportExportActions } from "./components/dialogs/ImportExportDialogs"
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
    return !localStorage.getItem(ONBOARDING_KEY)
  })
  const [showDebugDialog, setShowDebugDialog] = useState(false)
  const [showOfflineDialog, setShowOfflineDialog] = useState(false)
  const [importActions, setImportActions] = useState<ImportExportActions | null>(null)

  return (
    <PracticeProvider>
      <div className={`app-shell ${desktopSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <Sidebar
          onQuestionImport={() => importActions?.openQuestionImport()}
          onBackupImport={() => importActions?.openBackupImport()}
          onRemoteBackup={() => importActions?.openRemoteBackup()}
          onExportList={() => downloadJson(`${activeList.name}.json`, activeList)}
          onExportBackup={() =>
            showConfirm(t("confirmExportBackup"), () => downloadJson("passloop-config.json", data))
          }
          onResetAll={() => setResetConfirmDialog(true)}
          onOpenDebugDialog={() => setShowDebugDialog(true)}
          onOpenOfflineDialog={() => setShowOfflineDialog(true)}
        />

        <main className="workspace">
          <TopbarConnected />

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
          ) : (
            <PracticePage />
          )}

          <footer className="app-footer">
            © 2026{" "}
            <a href="https://github.com/yjh8144" target="_blank" rel="noopener noreferrer">
              yjh8144
            </a>
            . All rights reserved. <span className="app-version">v{__APP_VERSION__}</span>
          </footer>
        </main>

        <BottomNav
          onQuestionImport={() => importActions?.openQuestionImport()}
          onBackupImport={() => importActions?.openBackupImport()}
          onRemoteBackup={() => importActions?.openRemoteBackup()}
          onExportList={() => downloadJson(`${activeList.name}.json`, activeList)}
          onExportBackup={() =>
            showConfirm(t("confirmExportBackup"), () => downloadJson("passloop-config.json", data))
          }
          onResetAll={() => setResetConfirmDialog(true)}
        />

        <ToastStack toasts={toasts} />
        <ImportExportDialogs onReady={setImportActions} />
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
            localStorage.setItem(ONBOARDING_KEY, "1")
            setShowOnboarding(false)
          }}
        />
        <DebugDialog
          open={showDebugDialog}
          onClose={() => setShowDebugDialog(false)}
          onShowOnboarding={() => setShowOnboarding(true)}
          onCreateTestList={() => addImportedList(createTestQuestionList(t))}
        />
        <OfflineDialog open={showOfflineDialog} onClose={() => setShowOfflineDialog(false)} />
      </div>
    </PracticeProvider>
  )
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
  const { answers } = usePracticeContext()
  const { showConfirm } = useDialog()
  const t = useT()

  const hasAttempts = data.attempts.some((a) => a.listId === activeList.id)

  const changeActiveList = useCallback(
    (id: string) => {
      if (id === data.activeListId) return
      debugLog("Switch active list", { from: data.activeListId, to: id })
      const hasProgress = Object.keys(answers).length > 0
      if (hasProgress) {
        showConfirm(t("confirmSwitchList"), () => {
          setData((current) => ({ ...current, activeListId: id }))
        })
      } else {
        setData((current) => ({ ...current, activeListId: id }))
      }
    },
    [data.activeListId, answers, showConfirm, t, setData],
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
