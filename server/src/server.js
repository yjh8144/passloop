import http from "node:http"
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"

const scrypt = promisify(scryptCallback)
const SERVER_ROOT = fileURLToPath(new URL("..", import.meta.url))

const HOST = process.env.HOST || "127.0.0.1"
const PORT = Number(process.env.PORT || 8787)
const DATA_DIR = process.env.PASSLOOP_DATA_DIR || path.join(SERVER_ROOT, "data")
const USERS_FILE = path.join(DATA_DIR, "users.json")
const BACKUPS_DIR = path.join(DATA_DIR, "backups")
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 5 * 1024 * 1024)
const MAX_BACKUPS_PER_USER = Number(process.env.MAX_BACKUPS_PER_USER || 50)
const RATE_WINDOW_MS = Number(process.env.RATE_WINDOW_MS || 60_000)
const RATE_MAX = Number(process.env.RATE_MAX || 60)
const AUTH_FAIL_WINDOW_MS = Number(process.env.AUTH_FAIL_WINDOW_MS || 15 * 60_000)
const AUTH_FAIL_MAX = Number(process.env.AUTH_FAIL_MAX || 10)
const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,64}$/

const MIME_JSON = "application/json; charset=utf-8"
let usersFileQueue = Promise.resolve()

function now() {
  return new Date().toISOString()
}

function jsonResponse(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    "Content-Type": MIME_JSON,
    "Content-Length": Buffer.byteLength(body),
    ...headers,
  })
  res.end(body)
}

function errorResponse(res, status, message, code = "error") {
  jsonResponse(res, status, { error: { code, message } })
}

function addCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
}

async function readJsonBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) {
      throw new HttpError(413, `请求体超过限制：${MAX_BODY_BYTES} bytes`, "body_too_large")
    }
    chunks.push(chunk)
  }
  const text = Buffer.concat(chunks).toString("utf8")
  if (!text.trim()) throw new HttpError(400, "请求体不能为空", "empty_body")
  try {
    return JSON.parse(text)
  } catch {
    throw new HttpError(400, "请求体必须是合法 JSON", "invalid_json")
  }
}

class HttpError extends Error {
  constructor(status, message, code = "error") {
    super(message)
    this.status = status
    this.code = code
  }
}

const requestHits = new Map()
const authFailures = new Map()

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"]
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim()
  }
  return req.socket.remoteAddress || "unknown"
}

function slidingWindow(map, key, windowMs) {
  const now = Date.now()
  let list = map.get(key)
  if (!list) {
    list = []
    map.set(key, list)
  }
  while (list.length && now - list[0] > windowMs) list.shift()
  return list
}

function enforceRateLimit(ip) {
  const list = slidingWindow(requestHits, ip, RATE_WINDOW_MS)
  if (list.length >= RATE_MAX) {
    throw new HttpError(429, "请求过于频繁，请稍后再试", "rate_limited")
  }
  list.push(Date.now())
}

function enforceAuthLockout(ip) {
  const list = slidingWindow(authFailures, ip, AUTH_FAIL_WINDOW_MS)
  if (list.length >= AUTH_FAIL_MAX) {
    throw new HttpError(429, "登录失败次数过多，请稍后再试", "too_many_auth_failures")
  }
}

function recordAuthFailure(ip) {
  slidingWindow(authFailures, ip, AUTH_FAIL_WINDOW_MS).push(Date.now())
}

const rateLimitSweeper = setInterval(() => {
  const now = Date.now()
  for (const [ip, list] of requestHits) {
    while (list.length && now - list[0] > RATE_WINDOW_MS) list.shift()
    if (!list.length) requestHits.delete(ip)
  }
  for (const [ip, list] of authFailures) {
    while (list.length && now - list[0] > AUTH_FAIL_WINDOW_MS) list.shift()
    if (!list.length) authFailures.delete(ip)
  }
}, 5 * 60_000)
rateLimitSweeper.unref?.()

async function ensureStorage() {
  await mkdir(BACKUPS_DIR, { recursive: true })
  try {
    await stat(USERS_FILE)
  } catch {
    await writeAtomicJson(USERS_FILE, { version: 1, users: {} })
  }
}

async function readUsers() {
  await ensureStorage()
  try {
    const text = await readFile(USERS_FILE, "utf8")
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== "object" || typeof parsed.users !== "object") {
      return { version: 1, users: {} }
    }
    return { version: 1, users: parsed.users || {} }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new HttpError(500, "用户索引文件损坏，无法读取", "users_file_corrupt")
    }
    throw error
  }
}

async function writeUsers(usersFile) {
  await writeAtomicJson(USERS_FILE, usersFile)
}

async function withUsersFileLock(operation) {
  const run = usersFileQueue.then(operation, operation)
  usersFileQueue = run.catch(() => {})
  return run
}

async function writeAtomicJson(file, payload) {
  const tempFile = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tempFile, JSON.stringify(payload, null, 2), "utf8")
  await rename(tempFile, file)
}

function sanitizeUsername(username) {
  if (typeof username !== "string") {
    throw new HttpError(400, "用户名必须是字符串", "invalid_username")
  }
  const trimmed = username.trim()
  if (!USERNAME_PATTERN.test(trimmed)) {
    throw new HttpError(
      400,
      "用户名只能包含字母、数字、下划线、点和短横线，长度 3-64",
      "invalid_username",
    )
  }
  return trimmed
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 6 || password.length > 256) {
    throw new HttpError(400, "密码长度必须在 6-256 之间", "invalid_password")
  }
  return password
}

function validateAuth(input) {
  if (!input || typeof input !== "object") {
    throw new HttpError(400, "请求体必须是对象", "invalid_body")
  }
  return {
    username: sanitizeUsername(input.username),
    password: validatePassword(input.password),
  }
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex")
  const hash = await scrypt(password, salt, 64)
  return {
    algorithm: "scrypt",
    salt,
    hash: Buffer.from(hash).toString("hex"),
  }
}

async function verifyPassword(password, passwordRecord) {
  if (!passwordRecord || passwordRecord.algorithm !== "scrypt") return false
  const expected = Buffer.from(passwordRecord.hash, "hex")
  const actual = await scrypt(password, passwordRecord.salt, expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

async function requireUser(username, password) {
  const usersFile = await readUsers()
  const user = usersFile.users[username]
  if (!user || !(await verifyPassword(password, user.password))) {
    throw new HttpError(401, "用户名或密码不正确", "invalid_credentials")
  }
  return { usersFile, user }
}

async function getOrCreateUser(username, password) {
  const usersFile = await readUsers()
  let user = usersFile.users[username]
  if (user) {
    if (!(await verifyPassword(password, user.password))) {
      throw new HttpError(401, "用户名或密码不正确", "invalid_credentials")
    }
    return { usersFile, user, created: false }
  }

  const timestamp = now()
  user = {
    username,
    password: await hashPassword(password),
    createdAt: timestamp,
    updatedAt: timestamp,
    backups: [],
  }
  usersFile.users[username] = user
  await writeUsers(usersFile)
  await mkdir(userBackupDir(username), { recursive: true })
  return { usersFile, user, created: true }
}

function userBackupDir(username) {
  return path.join(BACKUPS_DIR, encodeURIComponent(username))
}

function backupFilePath(username, backupId) {
  return path.join(userBackupDir(username), `${backupId}.json`)
}

function validateConfigJson(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "config 必须是 JSON 对象", "invalid_config")
  }
  return value
}

function validateBackupId(value) {
  if (typeof value !== "string" || !/^[a-f0-9-]{36}$/.test(value)) {
    throw new HttpError(400, "backupId 不合法", "invalid_backup_id")
  }
  return value
}

function parsePage(value, fallback) {
  const num = Number(value ?? fallback)
  if (!Number.isInteger(num) || num < 1) {
    throw new HttpError(400, "page 必须是大于等于 1 的整数", "invalid_page")
  }
  return num
}

function parsePageSize(value, fallback) {
  const num = Number(value ?? fallback)
  if (!Number.isInteger(num) || num < 1 || num > 100) {
    throw new HttpError(400, "pageSize 必须是 1-100 的整数", "invalid_page_size")
  }
  return num
}

async function handleCreateBackup(req, res) {
  const body = await readJsonBody(req)
  const { username, password } = validateAuth(body)
  const config = validateConfigJson(body.config)
  const note = typeof body.note === "string" ? body.note.slice(0, 200) : ""
  const { backup, created } = await withUsersFileLock(async () => {
    const { usersFile, user, created: userCreated } = await getOrCreateUser(username, password)
    const id = randomUUID()
    const timestamp = now()
    const backup = {
      id,
      note,
      sizeBytes: Buffer.byteLength(JSON.stringify(config)),
      createdAt: timestamp,
    }

    await mkdir(userBackupDir(username), { recursive: true })
    await writeAtomicJson(backupFilePath(username, id), config)

    user.backups = Array.isArray(user.backups) ? user.backups : []
    user.backups.unshift(backup)
    // Cap stored backups per user to keep disk usage bounded; evict the oldest.
    const evicted =
      user.backups.length > MAX_BACKUPS_PER_USER
        ? user.backups.splice(MAX_BACKUPS_PER_USER)
        : []
    user.updatedAt = timestamp
    await writeUsers(usersFile)
    for (const old of evicted) {
      await unlink(backupFilePath(username, old.id)).catch(() => {})
    }
    return { backup, created: userCreated }
  })

  jsonResponse(res, created ? 201 : 200, {
    ok: true,
    registered: created,
    backup,
  })
}

async function handleListBackups(req, res) {
  const body = await readJsonBody(req)
  const { username, password } = validateAuth(body)
  const page = parsePage(body.page, 1)
  const pageSize = parsePageSize(body.pageSize, 20)
  const { user } = await requireUser(username, password)

  const backups = Array.isArray(user.backups) ? user.backups : []
  const total = backups.length
  const start = (page - 1) * pageSize
  const items = backups.slice(start, start + pageSize)

  jsonResponse(res, 200, {
    ok: true,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    items,
  })
}

async function handleDownloadBackup(req, res) {
  const body = await readJsonBody(req)
  const { username, password } = validateAuth(body)
  const backupId = validateBackupId(body.backupId)
  const { user } = await requireUser(username, password)
  const backup = Array.isArray(user.backups)
    ? user.backups.find((item) => item.id === backupId)
    : null
  if (!backup) {
    throw new HttpError(404, "备份不存在", "backup_not_found")
  }

  const file = backupFilePath(username, backupId)
  const text = await readFile(file, "utf8")
  const filename = `passloop-${username}-${backupId}.json`
  res.writeHead(200, {
    "Content-Type": MIME_JSON,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": Buffer.byteLength(text),
  })
  res.end(text)
}

async function route(req, res) {
  addCorsHeaders(res)
  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  const pathname = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`).pathname

  if (req.method === "GET" && pathname === "/health") {
    jsonResponse(res, 200, { ok: true, service: "passloop-backup-server" })
    return
  }

  const clientIp = getClientIp(req)
  enforceRateLimit(clientIp)

  if (req.method === "POST" && pathname === "/api/backups") {
    enforceAuthLockout(clientIp)
    await handleCreateBackup(req, res)
    return
  }

  if (req.method === "POST" && pathname === "/api/backups/list") {
    enforceAuthLockout(clientIp)
    await handleListBackups(req, res)
    return
  }

  if (req.method === "POST" && pathname === "/api/backups/download") {
    enforceAuthLockout(clientIp)
    await handleDownloadBackup(req, res)
    return
  }

  errorResponse(res, 404, "接口不存在", "not_found")
}

const server = http.createServer(async (req, res) => {
  try {
    await route(req, res)
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.code === "invalid_credentials") {
        recordAuthFailure(getClientIp(req))
      }
      errorResponse(res, error.status, error.message, error.code)
      return
    }
    console.error(error)
    errorResponse(res, 500, "服务器内部错误", "internal_error")
  }
})

await ensureStorage()

server.listen(PORT, HOST, () => {
  console.log(`PassLoop backup server listening on http://${HOST}:${PORT}`)
  console.log(`Data directory: ${DATA_DIR}`)
})
