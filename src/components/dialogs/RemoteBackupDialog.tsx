import { useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  CloudDownload,
  CloudUpload,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react"
import type { AppData } from "../../lib/types"
import {
  downloadRemoteBackup,
  listRemoteBackups,
  loadRemoteBackupSettings,
  saveRemoteBackupSettings,
  uploadRemoteBackup,
} from "../../lib/remoteBackup"
import type { RemoteBackupItem, RemoteBackupListResponse } from "../../lib/remoteBackup"
import { normalizeAppData } from "../../lib/storage"
import { usePushToast, useT } from "../../contexts"
import { useEscapeKey } from "../../hooks/useEscapeKey"

const PAGE_SIZE = 8

type BusyState = "idle" | "upload" | "list" | "download"

export function RemoteBackupDialog({
  open,
  data,
  onClose,
  onRestoreReady,
}: {
  open: boolean
  data: AppData
  onClose: () => void
  onRestoreReady: (data: AppData) => void
}) {
  if (!open) return null
  return <RemoteBackupDialogContent data={data} onClose={onClose} onRestoreReady={onRestoreReady} />
}

function RemoteBackupDialogContent({
  data,
  onClose,
  onRestoreReady,
}: {
  data: AppData
  onClose: () => void
  onRestoreReady: (data: AppData) => void
}) {
  const t = useT()
  const pushToast = usePushToast()
  const storedSettings = useMemo(() => loadRemoteBackupSettings(), [])
  const [serverUrl, setServerUrl] = useState(storedSettings.serverUrl)
  const [username, setUsername] = useState(storedSettings.username)
  const [password, setPassword] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState<BusyState>("idle")
  const [list, setList] = useState<RemoteBackupListResponse | null>(null)
  const [page, setPage] = useState(1)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const disabled = busy !== "idle"
  const canSubmit = Boolean(serverUrl.trim() && username.trim() && password)

  useEscapeKey(() => {
    if (!disabled) onClose()
  })

  const rememberSettings = () => {
    saveRemoteBackupSettings({
      serverUrl: serverUrl.trim(),
      username: username.trim(),
    })
  }

  const formatError = (error: unknown) => {
    if (!(error instanceof Error)) return t("remoteRequestFailed")
    const translated = t(error.message)
    return translated === error.message ? error.message : translated
  }

  const refreshList = async (
    targetPage = page,
    options: { rollbackList?: RemoteBackupListResponse | null } = {},
  ) => {
    if (!canSubmit) {
      pushToast("error", t("remoteCredentialsRequired"))
      return null
    }
    setBusy("list")
    try {
      const result = await listRemoteBackups({
        serverUrl,
        username,
        password,
        page: targetPage,
        pageSize: PAGE_SIZE,
      })
      rememberSettings()
      setList(result)
      setPage(result.page)
      return result
    } catch (error) {
      if ("rollbackList" in options) {
        setList(options.rollbackList ?? null)
      }
      pushToast("error", formatError(error))
      return null
    } finally {
      setBusy("idle")
    }
  }

  const uploadCurrent = async () => {
    if (!canSubmit) {
      pushToast("error", t("remoteCredentialsRequired"))
      return
    }
    let uploadedSuccessfully = false
    const previousList = list
    setBusy("upload")
    try {
      const result = await uploadRemoteBackup({
        serverUrl,
        username,
        password,
        note,
        config: data,
      })
      rememberSettings()
      pushToast(
        "success",
        result.registered ? t("remoteBackupRegistered") : t("remoteBackupUploaded"),
      )
      setNote("")
      setList((current) => optimisticUploadList(current, result.backup, PAGE_SIZE))
      setPage(1)
      uploadedSuccessfully = true
    } catch (error) {
      pushToast("error", formatError(error))
    } finally {
      setBusy("idle")
    }
    if (uploadedSuccessfully) await refreshList(1, { rollbackList: previousList })
  }

  const restoreBackup = async (backup: RemoteBackupItem) => {
    if (!canSubmit) {
      pushToast("error", t("remoteCredentialsRequired"))
      return
    }
    let restoredSuccessfully = false
    setBusy("download")
    setDownloadingId(backup.id)
    try {
      const downloaded = await downloadRemoteBackup({
        serverUrl,
        username,
        password,
        backupId: backup.id,
      })
      rememberSettings()
      const restored = normalizeAppData(downloaded)
      setBusy("idle")
      setDownloadingId(null)
      restoredSuccessfully = true
      onRestoreReady(restored)
      onClose()
      return
    } catch (error) {
      pushToast("error", formatError(error))
    } finally {
      if (!restoredSuccessfully) {
        setBusy("idle")
        setDownloadingId(null)
      }
    }
  }

  const totalPages = list?.totalPages ?? 0
  const hasPrevious = page > 1
  const hasNext = totalPages > 0 && page < totalPages

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("remoteBackupTitle")}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            disabled={disabled}
            aria-label={t("close")}
            title={t("close")}
          >
            <X size={18} />
          </button>
        </div>
        <p className="modal-desc">{t("remoteBackupDesc")}</p>

        <div className="remote-backup-grid">
          <label className="field-label remote-backup-wide">
            {t("remoteServerUrl")}
            <input
              value={serverUrl}
              onChange={(event) => setServerUrl(event.target.value)}
              placeholder="https://backup.example.com"
              disabled={disabled}
            />
          </label>
          <label className="field-label">
            {t("remoteUsername")}
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              disabled={disabled}
            />
          </label>
          <label className="field-label">
            {t("remotePassword")}
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              disabled={disabled}
              onKeyDown={(event) => {
                if (event.key === "Enter") refreshList(1)
              }}
            />
          </label>
          <label className="field-label remote-backup-wide">
            {t("remoteBackupNote")}
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("remoteBackupNotePlaceholder")}
              disabled={disabled}
            />
          </label>
        </div>

        <div className="remote-backup-actions">
          <button
            className="primary-button"
            onClick={uploadCurrent}
            disabled={!canSubmit || disabled}
          >
            {busy === "upload" ? (
              <>
                <Loader2 size={16} className="spin" /> {t("remoteUploading")}
              </>
            ) : (
              <>
                <CloudUpload size={16} /> {t("remoteUploadCurrent")}
              </>
            )}
          </button>
          <button onClick={() => refreshList(1)} disabled={!canSubmit || disabled}>
            {busy === "list" ? (
              <>
                <Loader2 size={16} className="spin" /> {t("remoteLoadingList")}
              </>
            ) : (
              <>
                <RefreshCw size={16} /> {t("remoteRefreshList")}
              </>
            )}
          </button>
        </div>

        <div className="remote-backup-list" aria-live="polite">
          <div className="remote-backup-list-head">
            <strong>{t("remoteBackupList")}</strong>
            {list && <span>{t("remoteBackupTotal", list.total)}</span>}
          </div>

          {!list ? (
            <div className="remote-backup-empty">{t("remoteBackupListEmptyHint")}</div>
          ) : list.items.length === 0 ? (
            <div className="remote-backup-empty">{t("remoteBackupNoItems")}</div>
          ) : (
            <div className="remote-backup-items">
              {list.items.map((item) => (
                <div className="remote-backup-item" key={item.id}>
                  <div className="remote-backup-item-main">
                    <strong>{item.note || t("remoteBackupUntitled")}</strong>
                    <span>
                      {formatDate(item.createdAt)} · {formatBytes(item.sizeBytes)}
                    </span>
                  </div>
                  <button
                    onClick={() => restoreBackup(item)}
                    disabled={disabled}
                    title={t("remoteRestoreBackup")}
                  >
                    {busy === "download" && downloadingId === item.id ? (
                      <>
                        <Loader2 size={16} className="spin" /> {t("downloading")}
                      </>
                    ) : (
                      <>
                        <CloudDownload size={16} /> {t("restore")}
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {list && (
          <div className="remote-backup-pagination">
            <button onClick={() => refreshList(page - 1)} disabled={!hasPrevious || disabled}>
              <ChevronLeft size={16} /> {t("previous")}
            </button>
            <span>{t("remoteBackupPage", page, Math.max(totalPages, 1))}</span>
            <button onClick={() => refreshList(page + 1)} disabled={!hasNext || disabled}>
              {t("next")} <ChevronRight size={16} />
            </button>
          </div>
        )}

        <p className="remote-backup-security-note">{t("remoteBackupSecurityNote")}</p>
      </div>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0 B"
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function optimisticUploadList(
  current: RemoteBackupListResponse | null,
  backup: RemoteBackupItem,
  pageSize: number,
): RemoteBackupListResponse {
  const items = [backup, ...(current?.items.filter((item) => item.id !== backup.id) ?? [])].slice(
    0,
    pageSize,
  )
  const total = (current?.total ?? 0) + 1
  return {
    ok: true,
    page: 1,
    pageSize: current?.pageSize ?? pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / (current?.pageSize ?? pageSize))),
    items,
  }
}
