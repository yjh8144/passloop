import { useEffect, useState } from "react"
import { useAppData, useProxy, usePushToast, useT } from "../../contexts"
import { useImportExport } from "../../hooks/useImportExport"
import { ImportSourceDialog } from "./ImportSourceDialog"
import { ImportChoiceDialog } from "./ImportChoiceDialog"
import { BackupImportDialog } from "./BackupImportDialog"
import { RemoteBackupDialog } from "./RemoteBackupDialog"

type ImportExportDialogKind = "question" | "backup" | "remote"

export function ImportExportDialogs({
  initialDialog,
  onDone,
}: {
  initialDialog: ImportExportDialogKind
  onDone: () => void
}) {
  const t = useT()
  const { data, setData, activeList, updateActiveList, updateData } = useAppData()
  const { proxySettings } = useProxy()
  const pushToast = usePushToast()
  const [showRemoteBackupDialog, setShowRemoteBackupDialog] = useState(initialDialog === "remote")

  const importExport = useImportExport({
    t,
    proxyConfig: proxySettings,
    pushToast,
    updateActiveList,
    updateData,
    data,
    setData,
    initialDialog: initialDialog === "remote" ? undefined : initialDialog,
  })

  useEffect(() => {
    const hasOpenDialog =
      importExport.showImportDialog ||
      importExport.showBackupImportDialog ||
      importExport.pendingImportLists ||
      importExport.pendingBackup ||
      showRemoteBackupDialog
    if (!hasOpenDialog) onDone()
  }, [
    importExport.showImportDialog,
    importExport.showBackupImportDialog,
    importExport.pendingImportLists,
    importExport.pendingBackup,
    showRemoteBackupDialog,
    onDone,
  ])

  return (
    <>
      <ImportSourceDialog
        open={importExport.showImportDialog}
        title={t("importTitle")}
        description={t("selectImportSource")}
        onClose={() => importExport.setShowImportDialog(false)}
        onFileSelect={importExport.handleQuestionImport}
        onUrlImport={importExport.handleUrlImport}
      />
      <ImportSourceDialog
        open={importExport.showBackupImportDialog}
        title={t("importBackup")}
        description={t("selectBackupImportSource")}
        onClose={() => importExport.setShowBackupImportDialog(false)}
        onFileSelect={importExport.handleBackupImport}
        onUrlImport={importExport.handleBackupUrlImport}
      />
      <ImportChoiceDialog
        lists={importExport.pendingImportLists}
        existingLists={data.lists}
        activeListId={activeList.id}
        activeListName={activeList.name}
        onClose={() => importExport.setPendingImportLists(null)}
        onChoose={importExport.commitImport}
      />
      <BackupImportDialog
        data={importExport.pendingBackup}
        onClose={() => importExport.setPendingBackup(null)}
        onChoose={importExport.commitBackupImport}
      />
      <RemoteBackupDialog
        open={showRemoteBackupDialog}
        data={data}
        onClose={() => setShowRemoteBackupDialog(false)}
        onRestoreReady={importExport.setPendingBackup}
      />
    </>
  )
}
