import { useMemo, useState } from "react"
import type { AppData, Question } from "./lib/types"
import { getTranslator } from "./lib/i18n/index"
import {
  I18nProvider,
  ToastProvider,
  DialogProvider,
  LlmConfigProvider,
  AppDataProvider,
  useAppData,
  useLlmConfig,
  NavigationProvider,
  useNavigation,
  PracticeProvider,
  usePracticeContext,
  useDialog,
  useT,
} from "./contexts"
import { createDefaultData, downloadJson, loadData } from "./lib/storage"
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
    updateActiveList,
    deleteList,
    clearActiveListAttempts,
    addImportedList,
  } = useAppData()
  const { llmConfig, openLlmConfig, clearLlmConfig: clearLlmConfigCtx } = useLlmConfig()
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
          onExportList={() => downloadJson(`${activeList.name}.json`, activeList)}
          onExportBackup={() =>
            showConfirm(t("confirmExportBackup"), () =>
              downloadJson("passloop-config.json", data)
            )
          }
          onResetAll={() => setResetConfirmDialog(true)}
          onOpenDebugDialog={() => setShowDebugDialog(true)}
          onOpenOfflineDialog={() => setShowOfflineDialog(true)}
        />

        <main className="workspace">
          <TopbarConnected onClearListAttempts={clearActiveListAttempts} />

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
            <PracticePage />
          )}
        </main>

        <BottomNav
          onQuestionImport={() => importActions?.openQuestionImport()}
          onBackupImport={() => importActions?.openBackupImport()}
          onExportList={() => downloadJson(`${activeList.name}.json`, activeList)}
          onExportBackup={() =>
            showConfirm(t("confirmExportBackup"), () =>
              downloadJson("passloop-config.json", data)
            )
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
        <DebugDialog open={showDebugDialog} onClose={() => setShowDebugDialog(false)} />
        <OfflineDialog open={showOfflineDialog} onClose={() => setShowOfflineDialog(false)} />
      </div>
    </PracticeProvider>
  )
}

function TopbarConnected({ onClearListAttempts }: { onClearListAttempts: () => void }) {
  const { data, activeList, query, setQuery, updateSettings } = useAppData()
  const { page } = useNavigation()
  const { resetWrongPractice, exportWrongList, createWrongList } = usePracticeContext()

  return (
    <Topbar
      page={page}
      query={query}
      setQuery={setQuery}
      data={data}
      updateSettings={updateSettings}
      activeList={activeList}
      onRedoWrong={resetWrongPractice}
      onExportWrong={exportWrongList}
      onCreateWrongList={createWrongList}
      onClearListAttempts={onClearListAttempts}
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

