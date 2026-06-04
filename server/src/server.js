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
const TRUST_PROXY = process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true"
const ID_PATTERN = /^[\s\S]{1,128}$/
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T/
const QUESTION_TYPES = new Set(["single", "multiple", "boolean", "blank", "short"])
const THEMES = new Set(["mint", "paper", "lavender", "ocean", "rose", "night", "nord"])
const LANGUAGES = new Set(["zh", "en", "ja", "ko", "fr"])
const VIEW_MODES = new Set(["single", "paper"])
const PRACTICE_MODES = new Set(["practice", "memorize"])
const SORT_MODES = new Set(["manual", "random", "name", "type", "type-random"])
const SUBMIT_MODES = new Set(["each", "paper"])
const REVEAL_MODES = new Set(["immediate", "end"])
const AUTO_NEXT_SCOPES = new Set(["all", "correct"])
const MAX_LISTS = Number(process.env.MAX_LISTS_PER_BACKUP || 200)
const MAX_QUESTIONS_PER_LIST = Number(process.env.MAX_QUESTIONS_PER_LIST || 5000)
const MAX_ATTEMPTS = Number(process.env.MAX_ATTEMPTS_PER_BACKUP || 50_000)
const MAX_TEXT_LENGTH = Number(process.env.MAX_TEXT_LENGTH || 20_000)
const CORS_ORIGINS = new Set(
  (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "*")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
)
const DEFAULT_SETTINGS = {
  theme: "mint",
  language: "zh",
  autoNext: false,
  autoNextPause: true,
  autoNextScope: "all",
  viewMode: "single",
  practiceMode: "practice",
  sortMode: "manual",
  typeOrder: [...QUESTION_TYPES],
  submitMode: "each",
  revealMode: "immediate",
  randomSeed: Date.now(),
}

const MIME_JSON = "application/json; charset=utf-8"
let usersFileQueue = Promise.resolve()

function now() {
  return new Date().toISOString()
}

function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
  }
}

function jsonResponse(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    ...securityHeaders(),
    "Content-Type": MIME_JSON,
    "Content-Length": Buffer.byteLength(body),
    ...headers,
  })
  res.end(body)
}

function errorResponse(res, status, message, code = "error") {
  jsonResponse(res, status, { error: { code, message } })
}

function addCorsHeaders(req, res) {
  const origin = req.headers.origin
  if (typeof origin === "string" && (CORS_ORIGINS.has("*") || CORS_ORIGINS.has(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Vary", "Origin")
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  res.setHeader("Access-Control-Max-Age", "600")
}

function requireJsonContentType(req) {
  const contentType = req.headers["content-type"]
  if (typeof contentType !== "string" || !contentType.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "请求 Content-Type 必须是 application/json", "unsupported_media_type")
  }
}

async function readJsonBody(req) {
  requireJsonContentType(req)
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
  const forwarded = TRUST_PROXY ? req.headers["x-forwarded-for"] : ""
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

function requireObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, `${field} 必须是 JSON 对象`, "invalid_config")
  }
  return value
}

function requireArray(value, field, max) {
  if (!Array.isArray(value)) {
    throw new HttpError(400, `${field} 必须是数组`, "invalid_config")
  }
  if (value.length > max) {
    throw new HttpError(400, `${field} 数量超过限制：${max}`, "invalid_config")
  }
  return value
}

function requireString(value, field, max = MAX_TEXT_LENGTH) {
  if (typeof value !== "string") {
    throw new HttpError(400, `${field} 必须是字符串`, "invalid_config")
  }
  if (value.length > max) {
    throw new HttpError(400, `${field} 长度超过限制：${max}`, "invalid_config")
  }
  return value
}

function requireId(value, field) {
  const text = requireString(value, field, 128)
  if (!ID_PATTERN.test(text)) {
    throw new HttpError(400, `${field} 不合法`, "invalid_config")
  }
  return text
}

function requireTimestamp(value, field) {
  const text = requireString(value, field, 64)
  if (!ISO_DATE_PATTERN.test(text) || Number.isNaN(new Date(text).getTime())) {
    throw new HttpError(400, `${field} 必须是 ISO 时间字符串`, "invalid_config")
  }
  return text
}

function requireEnum(value, allowed, field) {
  if (!allowed.has(value)) {
    throw new HttpError(400, `${field} 不合法`, "invalid_config")
  }
  return value
}

function requireBoolean(value, field) {
  if (typeof value !== "boolean") {
    throw new HttpError(400, `${field} 必须是布尔值`, "invalid_config")
  }
  return value
}

function requireNumber(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new HttpError(400, `${field} 必须是有限数字`, "invalid_config")
  }
  return value
}

function validateTextArray(value, field) {
  return requireArray(value, field, 200).map((item, index) =>
    requireString(item, `${field}[${index}]`),
  )
}

function validateOptions(value, field) {
  return requireArray(value, field, 200).map((item, index) => {
    const option = requireObject(item, `${field}[${index}]`)
    requireId(option.id, `${field}[${index}].id`)
    requireString(option.label, `${field}[${index}].label`, 128)
    requireString(option.text, `${field}[${index}].text`)
    return option
  })
}

function validateAnswer(value, type, field) {
  if (type === "multiple" || type === "blank" || type === "short") {
    return validateTextArray(value, field)
  }
  return requireString(value, field)
}

function createId() {
  return randomUUID()
}

function asString(value, fallback = "") {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  return fallback
}

function normalizeTimestamp(value) {
  const text = asString(value, "")
  return ISO_DATE_PATTERN.test(text) && !Number.isNaN(new Date(text).getTime()) ? text : now()
}

function optionLabel(index) {
  return String.fromCharCode(65 + index)
}

function normalizeType(value, source) {
  const text = String(value ?? "").toLowerCase()
  if (["single", "radio", "choice", "单选题", "单选"].includes(text)) return "single"
  if (["multiple", "checkbox", "多选题", "多选"].includes(text)) return "multiple"
  if (["boolean", "judge", "truefalse", "判断题", "判断"].includes(text)) return "boolean"
  if (["blank", "fill", "填空题", "填空"].includes(text)) return "blank"
  if (["short", "essay", "answer", "简答题", "简答"].includes(text)) return "short"
  if (Array.isArray(source.options ?? source.choices)) return "single"
  return "short"
}

function normalizeOptions(value, type) {
  if (type === "boolean") {
    return [
      { id: createId(), label: "T", text: "True" },
      { id: createId(), label: "F", text: "False" },
    ]
  }
  if (!Array.isArray(value)) return []
  return value.map((item, index) => {
    if (typeof item === "string") {
      return { id: createId(), label: optionLabel(index), text: item }
    }
    const source = item && typeof item === "object" ? item : {}
    return {
      id: asString(source.id, createId()),
      label: asString(source.label ?? source.key, optionLabel(index)),
      text: asString(source.text ?? source.content ?? source.value, ""),
    }
  })
}

function normalizeAnswer(value, type) {
  if (type === "multiple" || type === "blank" || type === "short") {
    if (Array.isArray(value)) return value.map((item) => String(item))
    if (typeof value === "string") {
      if (type === "multiple") {
        return value.includes("|")
          ? value.split("|").map((item) => item.trim())
          : value
            ? [value]
            : []
      }
      return value ? [value] : []
    }
    return []
  }
  if (typeof value === "boolean") return value ? "T" : "F"
  if (Array.isArray(value)) return value.join("、")
  return asString(value, "")
}

function normalizeQuestion(value, index = 0) {
  const timestamp = now()
  if (!value || typeof value !== "object") {
    return {
      id: createId(),
      type: "single",
      title: `Question ${index + 1}`,
      options: ["A", "B", "C", "D"].map((label) => ({ id: createId(), label, text: "" })),
      answer: "",
      explanation: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  }
  const source = value
  const type = normalizeType(source.type ?? source.questionType ?? source.kind, source)
  const rawTitle = asString(source.title ?? source.name ?? source.no, "")
  const rawPrompt = asString(
    source.prompt ?? source.question ?? source.stem ?? source.content ?? source.text,
    "",
  )
  const title = rawTitle || rawPrompt || `Question ${index + 1}`
  return {
    id: asString(source.id, createId()),
    type,
    title,
    options: normalizeOptions(source.options ?? source.choices ?? source.items, type),
    answer: normalizeAnswer(source.answer ?? source.answers ?? source.correctAnswer, type),
    explanation: asString(source.explanation ?? source.analysis ?? source.resolve, ""),
    hint: typeof source.hint === "string" ? source.hint : undefined,
    createdAt: normalizeTimestamp(source.createdAt ?? timestamp),
    updatedAt: normalizeTimestamp(source.updatedAt ?? timestamp),
  }
}

function deduplicateQuestionIds(questions) {
  const seen = new Set()
  return questions.map((question) => {
    if (seen.has(question.id)) return { ...question, id: createId() }
    seen.add(question.id)
    return question
  })
}

function normalizeList(value) {
  if (!value || typeof value !== "object") return null
  const timestamp = now()
  return {
    id: asString(value.id, createId()),
    name: asString(value.name, "Unnamed List"),
    description: asString(value.description, ""),
    questions: Array.isArray(value.questions)
      ? deduplicateQuestionIds(
          value.questions.map((question, index) => normalizeQuestion(question, index)),
        )
      : [],
    createdAt: normalizeTimestamp(value.createdAt ?? timestamp),
    updatedAt: normalizeTimestamp(value.updatedAt ?? timestamp),
  }
}

function deduplicateListIds(lists) {
  const seen = new Set()
  return lists.map((list) => {
    if (seen.has(list.id)) return { ...list, id: createId() }
    seen.add(list.id)
    return list
  })
}

function sanitizeTypeOrder(value) {
  const seen = new Set()
  const result = []
  if (Array.isArray(value)) {
    for (const item of value) {
      if (QUESTION_TYPES.has(item) && !seen.has(item)) {
        seen.add(item)
        result.push(item)
      }
    }
  }
  for (const type of QUESTION_TYPES) if (!seen.has(type)) result.push(type)
  return result
}

function createDefaultConfig() {
  const timestamp = now()
  const list = {
    id: createId(),
    name: "Default List",
    description: "",
    questions: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  return {
    version: 1,
    lists: [list],
    activeListId: list.id,
    attempts: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}

function normalizeAttempts(value, listIds, questionIdsByListId) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const listId = asString(item.listId, "")
      const questionId = asString(item.questionId, "")
      if (!listIds.has(listId) || !questionIdsByListId.get(listId)?.has(questionId)) return null
      const elapsedMs = Number(item.elapsedMs)
      return {
        id: asString(item.id, createId()),
        listId,
        questionId,
        answer: Array.isArray(item.answer)
          ? item.answer.map((answer) => String(answer))
          : asString(item.answer, ""),
        correct: typeof item.correct === "boolean" ? item.correct : false,
        elapsedMs: Number.isFinite(elapsedMs) && elapsedMs >= 0 ? elapsedMs : 0,
        submittedAt: normalizeTimestamp(item.submittedAt),
      }
    })
    .filter(Boolean)
}

function normalizeSettings(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {}
  const settings = { ...DEFAULT_SETTINGS }
  if (THEMES.has(source.theme)) settings.theme = source.theme
  if (LANGUAGES.has(source.language)) settings.language = source.language
  if (typeof source.autoNext === "boolean") settings.autoNext = source.autoNext
  if (typeof source.autoNextPause === "boolean") settings.autoNextPause = source.autoNextPause
  if (AUTO_NEXT_SCOPES.has(source.autoNextScope)) settings.autoNextScope = source.autoNextScope
  if (VIEW_MODES.has(source.viewMode)) settings.viewMode = source.viewMode
  if (PRACTICE_MODES.has(source.practiceMode)) settings.practiceMode = source.practiceMode
  if (SORT_MODES.has(source.sortMode)) settings.sortMode = source.sortMode
  if (SUBMIT_MODES.has(source.submitMode)) settings.submitMode = source.submitMode
  if (REVEAL_MODES.has(source.revealMode)) settings.revealMode = source.revealMode
  if (typeof source.randomSeed === "number" && Number.isFinite(source.randomSeed)) {
    settings.randomSeed = source.randomSeed
  }
  settings.typeOrder = sanitizeTypeOrder(source.typeOrder)
  if (settings.submitMode === "each" && settings.revealMode === "end") {
    settings.revealMode = "immediate"
  }
  return settings
}

function normalizeConfigJson(value) {
  if (!value || typeof value !== "object") return createDefaultConfig()
  const source = value
  const fallback = createDefaultConfig()
  const lists = Array.isArray(source.lists)
    ? source.lists.map(normalizeList).filter(Boolean)
    : fallback.lists
  const safeLists = deduplicateListIds(lists.length ? lists : fallback.lists)
  const activeListId =
    typeof source.activeListId === "string" &&
    safeLists.some((list) => list.id === source.activeListId)
      ? source.activeListId
      : safeLists[0].id
  const listIds = new Set(safeLists.map((list) => list.id))
  const questionIdsByListId = new Map(
    safeLists.map((list) => [list.id, new Set(list.questions.map((question) => question.id))]),
  )
  return {
    version: 1,
    lists: safeLists,
    activeListId,
    attempts: normalizeAttempts(source.attempts, listIds, questionIdsByListId),
    settings: normalizeSettings(source.settings),
  }
}

function validateQuestion(value, field) {
  const question = requireObject(value, field)
  const type = requireEnum(question.type, QUESTION_TYPES, `${field}.type`)
  requireId(question.id, `${field}.id`)
  requireString(question.title, `${field}.title`)
  validateOptions(question.options, `${field}.options`)
  validateAnswer(question.answer, type, `${field}.answer`)
  requireString(question.explanation, `${field}.explanation`)
  if (question.hint !== undefined) requireString(question.hint, `${field}.hint`)
  requireTimestamp(question.createdAt, `${field}.createdAt`)
  requireTimestamp(question.updatedAt, `${field}.updatedAt`)
  return question
}

function validateList(value, field) {
  const list = requireObject(value, field)
  requireId(list.id, `${field}.id`)
  requireString(list.name, `${field}.name`, 512)
  requireString(list.description, `${field}.description`)
  requireArray(list.questions, `${field}.questions`, MAX_QUESTIONS_PER_LIST).forEach((question, i) =>
    validateQuestion(question, `${field}.questions[${i}]`),
  )
  requireTimestamp(list.createdAt, `${field}.createdAt`)
  requireTimestamp(list.updatedAt, `${field}.updatedAt`)
  return list
}

function validateAttempt(value, field, listIds, questionIdsByListId) {
  const attempt = requireObject(value, field)
  requireId(attempt.id, `${field}.id`)
  const listId = requireId(attempt.listId, `${field}.listId`)
  if (!listIds.has(listId)) {
    throw new HttpError(400, `${field}.listId 不存在`, "invalid_config")
  }
  const questionId = requireId(attempt.questionId, `${field}.questionId`)
  if (!questionIdsByListId.get(listId)?.has(questionId)) {
    throw new HttpError(400, `${field}.questionId 不存在`, "invalid_config")
  }
  if (Array.isArray(attempt.answer)) validateTextArray(attempt.answer, `${field}.answer`)
  else requireString(attempt.answer, `${field}.answer`)
  requireBoolean(attempt.correct, `${field}.correct`)
  const elapsedMs = requireNumber(attempt.elapsedMs, `${field}.elapsedMs`)
  if (elapsedMs < 0) throw new HttpError(400, `${field}.elapsedMs 不合法`, "invalid_config")
  requireTimestamp(attempt.submittedAt, `${field}.submittedAt`)
  return attempt
}

function validateSettings(value) {
  const settings = requireObject(value, "config.settings")
  requireEnum(settings.theme, THEMES, "config.settings.theme")
  requireEnum(settings.language, LANGUAGES, "config.settings.language")
  requireBoolean(settings.autoNext, "config.settings.autoNext")
  requireBoolean(settings.autoNextPause, "config.settings.autoNextPause")
  requireEnum(settings.autoNextScope, AUTO_NEXT_SCOPES, "config.settings.autoNextScope")
  requireEnum(settings.viewMode, VIEW_MODES, "config.settings.viewMode")
  requireEnum(settings.practiceMode, PRACTICE_MODES, "config.settings.practiceMode")
  requireEnum(settings.sortMode, SORT_MODES, "config.settings.sortMode")
  const typeOrder = requireArray(settings.typeOrder, "config.settings.typeOrder", QUESTION_TYPES.size)
  const seenTypes = new Set()
  for (const [index, item] of typeOrder.entries()) {
    requireEnum(item, QUESTION_TYPES, `config.settings.typeOrder[${index}]`)
    if (seenTypes.has(item)) {
      throw new HttpError(400, "config.settings.typeOrder 不能包含重复题型", "invalid_config")
    }
    seenTypes.add(item)
  }
  requireEnum(settings.submitMode, SUBMIT_MODES, "config.settings.submitMode")
  requireEnum(settings.revealMode, REVEAL_MODES, "config.settings.revealMode")
  requireNumber(settings.randomSeed, "config.settings.randomSeed")
  return settings
}

function validateConfigJson(value) {
  const config = normalizeConfigJson(requireObject(value, "config"))
  const lists = requireArray(config.lists, "config.lists", MAX_LISTS)
  const listIds = new Set()
  const questionIdsByListId = new Map()
  for (const [index, list] of lists.entries()) {
    validateList(list, `config.lists[${index}]`)
    const id = list.id
    if (listIds.has(id)) throw new HttpError(400, "config.lists 存在重复 id", "invalid_config")
    listIds.add(id)
    questionIdsByListId.set(id, new Set(list.questions.map((question) => question.id)))
  }
  const activeListId = requireId(config.activeListId, "config.activeListId")
  if (!listIds.has(activeListId)) {
    throw new HttpError(400, "config.activeListId 不存在", "invalid_config")
  }
  requireArray(config.attempts, "config.attempts", MAX_ATTEMPTS).forEach((attempt, index) =>
    validateAttempt(attempt, `config.attempts[${index}]`, listIds, questionIdsByListId),
  )
  validateSettings(config.settings)
  return config
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
    ...securityHeaders(),
    "Content-Type": MIME_JSON,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": Buffer.byteLength(text),
  })
  res.end(text)
}

async function route(req, res) {
  addCorsHeaders(req, res)
  if (req.method === "OPTIONS") {
    res.writeHead(204, securityHeaders())
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
