import type { AppData } from "./types"

const REMOTE_BACKUP_SETTINGS_KEY = "passloop.remote-backup.v1"

export interface RemoteBackupSettings {
  serverUrl: string
  username: string
}

export interface RemoteBackupItem {
  id: string
  note: string
  sizeBytes: number
  createdAt: string
}

export interface RemoteBackupListResponse {
  ok: boolean
  page: number
  pageSize: number
  total: number
  totalPages: number
  items: RemoteBackupItem[]
}

export interface RemoteBackupUploadResponse {
  ok: boolean
  registered: boolean
  backup: RemoteBackupItem
}

export function loadRemoteBackupSettings(): RemoteBackupSettings {
  try {
    const raw = localStorage.getItem(REMOTE_BACKUP_SETTINGS_KEY)
    if (!raw) return { serverUrl: "", username: "" }
    const parsed = JSON.parse(raw) as Partial<RemoteBackupSettings>
    return {
      serverUrl: typeof parsed.serverUrl === "string" ? parsed.serverUrl : "",
      username: typeof parsed.username === "string" ? parsed.username : "",
    }
  } catch {
    return { serverUrl: "", username: "" }
  }
}

export function saveRemoteBackupSettings(settings: RemoteBackupSettings) {
  try {
    localStorage.setItem(
      REMOTE_BACKUP_SETTINGS_KEY,
      JSON.stringify({
        serverUrl: settings.serverUrl,
        username: settings.username,
      }),
    )
  } catch {
    // Remembering these fields is only a convenience; the backup action itself should continue.
  }
}

export function normalizeRemoteServerUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "")
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error("invalidRemoteServerUrl")
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("invalidRemoteServerUrl")
  }
  return trimmed
}

function validateCredentials(username: string, password: string) {
  if (!username.trim()) throw new Error("remoteUsernameRequired")
  if (!password) throw new Error("remotePasswordRequired")
}

async function requestJson<T>(serverUrl: string, endpoint: string, payload: unknown): Promise<T> {
  const response = await fetch(`${serverUrl}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const text = await response.text()
  let parsed: unknown = null
  if (text.trim()) {
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error("remoteInvalidResponse")
    }
  }
  if (!response.ok) {
    const message =
      parsed &&
      typeof parsed === "object" &&
      "error" in parsed &&
      parsed.error &&
      typeof parsed.error === "object" &&
      "message" in parsed.error &&
      typeof parsed.error.message === "string"
        ? parsed.error.message
        : "remoteRequestFailed"
    throw new Error(message)
  }
  return parsed as T
}

export async function uploadRemoteBackup(params: {
  serverUrl: string
  username: string
  password: string
  note: string
  config: AppData
}) {
  const serverUrl = normalizeRemoteServerUrl(params.serverUrl)
  validateCredentials(params.username, params.password)
  return requestJson<RemoteBackupUploadResponse>(serverUrl, "/api/backups", {
    username: params.username.trim(),
    password: params.password,
    note: params.note.trim(),
    config: params.config,
  })
}

export async function listRemoteBackups(params: {
  serverUrl: string
  username: string
  password: string
  page: number
  pageSize: number
}) {
  const serverUrl = normalizeRemoteServerUrl(params.serverUrl)
  validateCredentials(params.username, params.password)
  return requestJson<RemoteBackupListResponse>(serverUrl, "/api/backups/list", {
    username: params.username.trim(),
    password: params.password,
    page: params.page,
    pageSize: params.pageSize,
  })
}

export async function downloadRemoteBackup(params: {
  serverUrl: string
  username: string
  password: string
  backupId: string
}) {
  const serverUrl = normalizeRemoteServerUrl(params.serverUrl)
  validateCredentials(params.username, params.password)
  const response = await fetch(`${serverUrl}/api/backups/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: params.username.trim(),
      password: params.password,
      backupId: params.backupId,
    }),
  })
  const text = await response.text()
  if (!response.ok) {
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } }
      throw new Error(parsed.error?.message || "remoteRequestFailed")
    } catch (error) {
      if (
        error instanceof Error &&
        error.name !== "SyntaxError" &&
        error.message !== "remoteRequestFailed"
      ) {
        throw error
      }
      throw new Error("remoteRequestFailed")
    }
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error("remoteInvalidResponse")
  }
}
