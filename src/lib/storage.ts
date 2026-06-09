import type {
  AppData,
  AttemptRecord,
  LlmConfig,
  LlmMultiConfig,
  LlmProvider,
  ProxySettings,
  Question,
  QuestionList,
  QuestionType,
  Settings,
} from "./types"
import { createId, normalizeQuestion } from "./question"
import { questionTypes } from "../utils/constants"
import { debugError } from "./debug"
import { safeGetStorageItem, safeRemoveStorageItem, safeSetStorageItem } from "../utils/safeStorage"

export const STORAGE_KEY = "passloop.app.v1"
export const LLM_CONFIG_STORAGE_KEY = "passloop.llm-config.v1"
export const LLM_MULTI_CONFIG_STORAGE_KEY = "passloop.llm-config.v2"
export const PROXY_STORAGE_KEY = "passloop.proxy.v1"

const now = () => new Date().toISOString()

function omitSecret(_value: string): string {
  // Static frontends cannot safely persist API keys. Keep secrets in React state only.
  return ""
}

export const defaultSettings: Settings = {
  theme: "mint",
  language: "zh",
  autoNext: false,
  autoNextPause: true,
  autoNextScope: "all",
  viewMode: "single",
  practiceMode: "practice",
  sortMode: "manual",
  typeOrder: [...questionTypes],
  submitMode: "each",
  revealMode: "immediate",
  randomSeed: Date.now(),
}

export function sanitizeTypeOrder(value: unknown): QuestionType[] {
  const seen = new Set<QuestionType>()
  const result: QuestionType[] = []
  if (Array.isArray(value)) {
    for (const item of value) {
      if (questionTypes.includes(item as QuestionType) && !seen.has(item as QuestionType)) {
        seen.add(item as QuestionType)
        result.push(item as QuestionType)
      }
    }
  }
  for (const type of questionTypes) if (!seen.has(type)) result.push(type)
  return result
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function pickBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback
}

function normalizeSettings(value: unknown): Settings {
  const source = value && typeof value === "object" ? (value as Partial<Settings>) : {}
  const settings: Settings = {
    theme: pickEnum(
      source.theme,
      ["mint", "paper", "lavender", "ocean", "rose", "night", "nord"],
      defaultSettings.theme,
    ),
    language: pickEnum(source.language, ["zh", "en", "ja", "ko", "fr"], defaultSettings.language),
    autoNext: pickBoolean(source.autoNext, defaultSettings.autoNext),
    autoNextPause: pickBoolean(source.autoNextPause, defaultSettings.autoNextPause),
    autoNextScope: pickEnum(
      source.autoNextScope,
      ["all", "correct"],
      defaultSettings.autoNextScope,
    ),
    viewMode: pickEnum(source.viewMode, ["single", "paper"], defaultSettings.viewMode),
    practiceMode: pickEnum(
      source.practiceMode,
      ["practice", "memorize"],
      defaultSettings.practiceMode,
    ),
    sortMode: pickEnum(
      source.sortMode,
      ["manual", "random", "name", "type", "type-random"],
      defaultSettings.sortMode,
    ),
    typeOrder: sanitizeTypeOrder(source.typeOrder),
    submitMode: pickEnum(source.submitMode, ["each", "paper"], defaultSettings.submitMode),
    revealMode: pickEnum(source.revealMode, ["immediate", "end"], defaultSettings.revealMode),
    randomSeed:
      typeof source.randomSeed === "number" && Number.isFinite(source.randomSeed)
        ? source.randomSeed
        : defaultSettings.randomSeed,
  }
  if (settings.submitMode === "each" && settings.revealMode === "end") {
    settings.revealMode = "immediate"
  }
  return settings
}

export function createEmptyQuestionList(name = "Default List"): QuestionList {
  const timestamp = now()
  return {
    id: createId(),
    name,
    description: "",
    questions: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createDefaultData(): AppData {
  const list = createEmptyQuestionList()
  return {
    version: 1,
    lists: [list],
    activeListId: list.id,
    attempts: [],
    settings: defaultSettings,
  }
}

export function loadData(): AppData {
  try {
    const raw = safeGetStorageItem("local", STORAGE_KEY)
    if (!raw) return createDefaultData()
    return normalizeAppData(JSON.parse(raw))
  } catch (e) {
    debugError("loadData parse failed", e)
    return createDefaultData()
  }
}

export function saveData(data: AppData): boolean {
  try {
    const serialized = JSON.stringify(data)
    if (safeGetStorageItem("local", STORAGE_KEY) !== serialized) {
      return safeSetStorageItem("local", STORAGE_KEY, serialized)
    }
    return true
  } catch (e) {
    debugError("saveData failed", e)
    return false
  }
}

export function loadLlmConfig(fallback: LlmConfig): LlmConfig {
  try {
    const raw = safeGetStorageItem("local", LLM_CONFIG_STORAGE_KEY)
    if (!raw) return fallback
    const source = JSON.parse(raw) as Partial<LlmConfig>
    return {
      ...fallback,
      provider: isLlmProvider(source.provider) ? source.provider : fallback.provider,
      model: typeof source.model === "string" ? source.model : fallback.model,
      endpoint: typeof source.endpoint === "string" ? source.endpoint : fallback.endpoint,
      apiKey: fallback.apiKey,
      proxyEnabled:
        typeof source.proxyEnabled === "boolean" ? source.proxyEnabled : fallback.proxyEnabled,
      proxyUrl: typeof source.proxyUrl === "string" ? source.proxyUrl : fallback.proxyUrl,
      proxyKey: fallback.proxyKey,
      fillAnswer: typeof source.fillAnswer === "boolean" ? source.fillAnswer : fallback.fillAnswer,
      fillExplanation:
        typeof source.fillExplanation === "boolean"
          ? source.fillExplanation
          : fallback.fillExplanation,
    }
  } catch (e) {
    debugError("loadLlmConfig parse failed", e)
    return fallback
  }
}

export function saveLlmConfig(config: LlmConfig): boolean {
  try {
    return safeSetStorageItem(
      "local",
      LLM_CONFIG_STORAGE_KEY,
      JSON.stringify({
        provider: config.provider,
        model: config.model,
        endpoint: config.endpoint,
        apiKey: omitSecret(config.apiKey),
        proxyEnabled: config.proxyEnabled,
        proxyUrl: config.proxyUrl,
        proxyKey: omitSecret(config.proxyKey),
        fillAnswer: config.fillAnswer,
        fillExplanation: config.fillExplanation,
      }),
    )
  } catch (e) {
    debugError("saveLlmConfig failed", e)
    return false
  }
}

export function clearLlmConfig() {
  safeRemoveStorageItem("local", LLM_CONFIG_STORAGE_KEY)
}

export function loadLlmMultiConfig(fallback: LlmMultiConfig): LlmMultiConfig {
  try {
    const rawV2 = safeGetStorageItem("local", LLM_MULTI_CONFIG_STORAGE_KEY)
    if (rawV2) {
      return normalizeMultiConfig(JSON.parse(rawV2), fallback)
    }
    const rawV1 = safeGetStorageItem("local", LLM_CONFIG_STORAGE_KEY)
    if (rawV1) {
      const v1 = JSON.parse(rawV1) as Partial<LlmConfig>
      const migrated = migrateV1ToV2(v1, fallback)
      saveLlmMultiConfig(migrated)
      safeRemoveStorageItem("local", LLM_CONFIG_STORAGE_KEY)
      return migrated
    }
    return fallback
  } catch (e) {
    debugError("loadLlmMultiConfig parse failed", e)
    return fallback
  }
}

export function saveLlmMultiConfig(config: LlmMultiConfig): boolean {
  try {
    const toStore = {
      ...config,
      providers: config.providers.map((p) => ({ ...p, apiKey: omitSecret(p.apiKey) })),
    }
    return safeSetStorageItem("local", LLM_MULTI_CONFIG_STORAGE_KEY, JSON.stringify(toStore))
  } catch (e) {
    debugError("saveLlmMultiConfig failed", e)
    return false
  }
}

export function clearLlmMultiConfig() {
  safeRemoveStorageItem("local", LLM_MULTI_CONFIG_STORAGE_KEY)
}

export function loadProxySettings(fallback: ProxySettings): ProxySettings {
  try {
    const raw = safeGetStorageItem("local", PROXY_STORAGE_KEY)
    if (raw) {
      const source = JSON.parse(raw) as Partial<ProxySettings>
      return {
        proxyEnabled:
          typeof source.proxyEnabled === "boolean" ? source.proxyEnabled : fallback.proxyEnabled,
        proxyUrl: typeof source.proxyUrl === "string" ? source.proxyUrl : fallback.proxyUrl,
        proxyKey: fallback.proxyKey,
      }
    }
    const rawMulti = safeGetStorageItem("local", LLM_MULTI_CONFIG_STORAGE_KEY)
    if (rawMulti) {
      const multi = JSON.parse(rawMulti) as {
        providers?: Array<
          Partial<LlmProvider & { proxyEnabled?: boolean; proxyUrl?: string; proxyKey?: string }>
        >
      }
      const first = multi.providers?.[0]
      if (first && typeof first.proxyUrl === "string" && first.proxyUrl) {
        const migrated: ProxySettings = {
          proxyEnabled:
            typeof first.proxyEnabled === "boolean" ? first.proxyEnabled : fallback.proxyEnabled,
          proxyUrl: first.proxyUrl,
          proxyKey: fallback.proxyKey,
        }
        saveProxySettings(migrated)
        return migrated
      }
    }
    return fallback
  } catch (e) {
    debugError("loadProxySettings failed", e)
    return fallback
  }
}

export function saveProxySettings(settings: ProxySettings): boolean {
  try {
    const toStore = { ...settings, proxyKey: omitSecret(settings.proxyKey) }
    return safeSetStorageItem("local", PROXY_STORAGE_KEY, JSON.stringify(toStore))
  } catch (e) {
    debugError("saveProxySettings failed", e)
    return false
  }
}

function migrateV1ToV2(v1: Partial<LlmConfig>, _fallback: LlmMultiConfig): LlmMultiConfig {
  const provider = isLlmProvider(v1.provider) ? v1.provider : "openai"
  const timestamp = now()
  const id = createId()
  const hasProviderConfig =
    typeof v1.model === "string" || typeof v1.endpoint === "string" || isLlmProvider(v1.provider)

  if (typeof v1.proxyUrl === "string" && v1.proxyUrl) {
    const proxyMigrated: ProxySettings = {
      proxyEnabled: typeof v1.proxyEnabled === "boolean" ? v1.proxyEnabled : true,
      proxyUrl: v1.proxyUrl,
      proxyKey: "",
    }
    if (!safeGetStorageItem("local", PROXY_STORAGE_KEY)) {
      saveProxySettings(proxyMigrated)
    }
  }

  const entry: LlmProvider = {
    id,
    name: getDefaultProviderName(provider, typeof v1.model === "string" ? v1.model : ""),
    provider,
    endpoint: typeof v1.endpoint === "string" ? v1.endpoint : "",
    apiKey: "",
    model: typeof v1.model === "string" ? v1.model : "",
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  return {
    version: 2,
    providers: hasProviderConfig ? [entry] : [],
    assignments: hasProviderConfig ? { parse: id, fill: id } : { parse: null, fill: null },
  }
}

function getDefaultProviderName(provider: string, model: string): string {
  const label = provider === "openai" ? "OpenAI" : provider === "anthropic" ? "Anthropic" : "Gemini"
  return model ? `${label} (${model})` : label
}

function normalizeMultiConfig(source: unknown, fallback: LlmMultiConfig): LlmMultiConfig {
  if (!source || typeof source !== "object") return fallback
  const s = source as Partial<LlmMultiConfig>
  const providers = Array.isArray(s.providers)
    ? s.providers.filter(isValidProvider).map((p) => ({ ...p, apiKey: "" }))
    : []
  const providerIds = new Set(providers.map((p) => p.id))
  return {
    version: 2,
    providers,
    assignments: {
      parse:
        typeof s.assignments?.parse === "string" && providerIds.has(s.assignments.parse)
          ? s.assignments.parse
          : null,
      fill:
        typeof s.assignments?.fill === "string" && providerIds.has(s.assignments.fill)
          ? s.assignments.fill
          : null,
    },
  }
}

function isValidProvider(value: unknown): value is LlmProvider {
  if (!value || typeof value !== "object") return false
  const p = value as Partial<LlmProvider>
  return typeof p.id === "string" && typeof p.provider === "string" && isLlmProvider(p.provider)
}

function isLlmProvider(value: unknown): value is LlmConfig["provider"] {
  return value === "openai" || value === "gemini" || value === "anthropic"
}

export function normalizeAppData(value: unknown): AppData {
  const fallback = createDefaultData()
  if (!value || typeof value !== "object") return fallback
  const source = value as Partial<AppData>
  const entries = Array.isArray(source.lists)
    ? source.lists.map(normalizeListEntry).filter(Boolean)
    : fallback.lists.map((list) => ({
        list,
        originalListId: list.id,
        questionIdMap: new Map(list.questions.map((question) => [question.id, question.id])),
      }))
  const safeEntries = deduplicateListEntries(
    entries.length ? (entries as NormalizedListEntry[]) : normalizeFallbackEntries(fallback.lists),
  )
  const safeLists = safeEntries.map((entry) => entry.list)
  const activeListId =
    typeof source.activeListId === "string" &&
    safeLists.some((list) => list.id === source.activeListId)
      ? source.activeListId
      : safeLists[0].id
  const result: AppData = {
    version: 1,
    lists: safeLists,
    activeListId,
    attempts: normalizeAttempts(source.attempts, safeEntries),
    settings: normalizeSettings(source.settings),
  }
  return result
}

interface NormalizedListEntry {
  list: QuestionList
  originalListId: string
  questionIdMap: Map<string, string>
}

function normalizeFallbackEntries(lists: QuestionList[]): NormalizedListEntry[] {
  return lists.map((list) => ({
    list,
    originalListId: list.id,
    questionIdMap: new Map(list.questions.map((question) => [question.id, question.id])),
  }))
}

function deduplicateListEntries(entries: NormalizedListEntry[]): NormalizedListEntry[] {
  const seen = new Set<string>()
  return entries.map((entry) => {
    const { list } = entry
    if (seen.has(list.id)) {
      const nextList = { ...list, id: createId() }
      seen.add(nextList.id)
      return { ...entry, list: nextList }
    }
    seen.add(list.id)
    return entry
  })
}

export function normalizeList(value: unknown): QuestionList | null {
  return normalizeListEntry(value)?.list ?? null
}

function normalizeListEntry(value: unknown): NormalizedListEntry | null {
  if (!value || typeof value !== "object") return null
  const source = value as Partial<QuestionList>
  const timestamp = now()
  const originalListId = typeof source.id === "string" ? source.id : createId()
  const questions = Array.isArray(source.questions)
    ? normalizeQuestionsWithMap(source.questions)
    : { questions: [], questionIdMap: new Map<string, string>() }
  return {
    originalListId,
    questionIdMap: questions.questionIdMap,
    list: {
      id: originalListId,
      name: typeof source.name === "string" ? source.name : "Unnamed List",
      description: typeof source.description === "string" ? source.description : "",
      questions: questions.questions,
      createdAt: typeof source.createdAt === "string" ? source.createdAt : timestamp,
      updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : timestamp,
    },
  }
}

function normalizeQuestionsWithMap(values: unknown[]): {
  questions: Question[]
  questionIdMap: Map<string, string>
} {
  const seen = new Set<string>()
  const questionIdMap = new Map<string, string>()
  const questions = values.map((question, index) => {
    const normalized = normalizeQuestion(question, index)
    const source = question && typeof question === "object" ? (question as Partial<Question>) : {}
    const originalQuestionId = typeof source.id === "string" ? source.id : normalized.id
    const safeQuestion = seen.has(normalized.id) ? { ...normalized, id: createId() } : normalized
    seen.add(safeQuestion.id)
    if (!questionIdMap.has(originalQuestionId)) {
      questionIdMap.set(originalQuestionId, safeQuestion.id)
    }
    return safeQuestion
  })
  return { questions, questionIdMap }
}

function normalizeAttempts(value: unknown, entries: NormalizedListEntry[]): AttemptRecord[] {
  if (!Array.isArray(value)) return []
  const byOriginalListId = new Map<string, NormalizedListEntry[]>()
  const bySafeListId = new Map<string, NormalizedListEntry>()
  for (const entry of entries) {
    const listEntries = byOriginalListId.get(entry.originalListId) ?? []
    listEntries.push(entry)
    byOriginalListId.set(entry.originalListId, listEntries)
    bySafeListId.set(entry.list.id, entry)
  }
  return value
    .map((item) => normalizeAttempt(item, byOriginalListId, bySafeListId))
    .filter((attempt): attempt is AttemptRecord => attempt !== null)
}

function normalizeAttempt(
  value: unknown,
  byOriginalListId: Map<string, NormalizedListEntry[]>,
  bySafeListId: Map<string, NormalizedListEntry>,
): AttemptRecord | null {
  if (!value || typeof value !== "object") return null
  const source = value as Partial<AttemptRecord>
  if (typeof source.listId !== "string" || typeof source.questionId !== "string") return null
  const originalListId = source.listId
  const originalQuestionId = source.questionId
  const candidates = byOriginalListId.get(originalListId) ?? []
  const entry =
    candidates.find((candidate) => candidate.questionIdMap.has(originalQuestionId)) ??
    bySafeListId.get(originalListId) ??
    candidates[0]
  const listId = entry?.list.id ?? originalListId
  const questionId = entry?.questionIdMap.get(originalQuestionId) ?? originalQuestionId
  const elapsedMs =
    typeof source.elapsedMs === "number" && Number.isFinite(source.elapsedMs)
      ? Math.max(0, source.elapsedMs)
      : 0
  return {
    id: typeof source.id === "string" ? source.id : createId(),
    listId,
    questionId,
    answer: normalizeAttemptAnswer(source.answer),
    correct: typeof source.correct === "boolean" ? source.correct : false,
    elapsedMs,
    submittedAt: typeof source.submittedAt === "string" ? source.submittedAt : now(),
  }
}

function normalizeAttemptAnswer(value: unknown): string | string[] {
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return ""
}

export function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
