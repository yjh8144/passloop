import { useEffect } from "react"
import { useAppData, useProxy, usePushToast, useT } from "../../contexts"
import { useImportExport } from "../../hooks/useImportExport"
import { ImportSourceDialog } from "./ImportSourceDialog"
import { ImportChoiceDialog } from "./ImportChoiceDialog"
import { BackupImportDialog } from "./BackupImportDialog"

export interface ImportExportActions {
  openQuestionImport: () => void
  openBackupImport: () => void
}

export function ImportExportDialogs({
  onReady,
}: {
  onReady: (actions: ImportExportActions) => void
}) {
  const t = useT()
  const { data, setData, activeList, updateActiveList, updateData } = useAppData()
  const { proxySettings } = useProxy()
  const pushToast = usePushToast()

  const importExport = useImportExport({
    t,
    proxyConfig: proxySettings,
    pushToast,
    updateActiveList,
    updateData,
    data,
    setData,
  })

  const { setShowImportDialog, setShowBackupImportDialog } = importExport

  useEffect(() => {
    onReady({
      openQuestionImport: () => setShowImportDialog(true),
      openBackupImport: () => setShowBackupImportDialog(true),
    })
  }, [onReady, setShowImportDialog, setShowBackupImportDialog])

  return (
    <>
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
    </>
  )
}
