import type {
  AppData,
  LlmConfig,
  LlmMultiConfig,
  LlmProvider,
  QuestionList,
  Settings,
} from "./types"
import { createId, normalizeQuestion } from "./question"
import { debugError } from "./debug"

export const STORAGE_KEY = "passloop.app.v1"
export const LLM_CONFIG_STORAGE_KEY = "passloop.llm-config.v1"
export const LLM_MULTI_CONFIG_STORAGE_KEY = "passloop.llm-config.v2"

const now = () => new Date().toISOString()

export const defaultSettings: Settings = {
  theme: "mint",
  language: "zh",
  autoNext: false,
  viewMode: "single",
  practiceMode: "practice",
  sortMode: "manual",
  submitMode: "each",
  revealMode: "immediate",
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
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultData()
    return normalizeAppData(JSON.parse(raw))
  } catch (e) {
    debugError("loadData parse failed", e)
    return createDefaultData()
  }
}

export function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function loadLlmConfig(fallback: LlmConfig): LlmConfig {
  try {
    const raw = localStorage.getItem(LLM_CONFIG_STORAGE_KEY)
    if (!raw) return fallback
    const source = JSON.parse(raw) as Partial<LlmConfig>
    return {
      ...fallback,
      provider: isLlmProvider(source.provider) ? source.provider : fallback.provider,
      model: typeof source.model === "string" ? source.model : fallback.model,
      endpoint: typeof source.endpoint === "string" ? source.endpoint : fallback.endpoint,
      apiKey: typeof source.apiKey === "string" ? source.apiKey : fallback.apiKey,
      proxyEnabled:
        typeof source.proxyEnabled === "boolean" ? source.proxyEnabled : fallback.proxyEnabled,
      proxyUrl: typeof source.proxyUrl === "string" ? source.proxyUrl : fallback.proxyUrl,
      proxyKey: typeof source.proxyKey === "string" ? source.proxyKey : fallback.proxyKey,
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

export function saveLlmConfig(config: LlmConfig) {
  localStorage.setItem(
    LLM_CONFIG_STORAGE_KEY,
    JSON.stringify({
      provider: config.provider,
      model: config.model,
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      proxyEnabled: config.proxyEnabled,
      proxyUrl: config.proxyUrl,
      proxyKey: config.proxyKey,
      fillAnswer: config.fillAnswer,
      fillExplanation: config.fillExplanation,
    }),
  )
}

export function clearLlmConfig() {
  localStorage.removeItem(LLM_CONFIG_STORAGE_KEY)
}

export function loadLlmMultiConfig(fallback: LlmMultiConfig): LlmMultiConfig {
  try {
    const rawV2 = localStorage.getItem(LLM_MULTI_CONFIG_STORAGE_KEY)
    if (rawV2) {
      return normalizeMultiConfig(JSON.parse(rawV2), fallback)
    }
    const rawV1 = localStorage.getItem(LLM_CONFIG_STORAGE_KEY)
    if (rawV1) {
      const v1 = JSON.parse(rawV1) as Partial<LlmConfig>
      const migrated = migrateV1ToV2(v1, fallback)
      saveLlmMultiConfig(migrated)
      localStorage.removeItem(LLM_CONFIG_STORAGE_KEY)
      return migrated
    }
    return fallback
  } catch (e) {
    debugError("loadLlmMultiConfig parse failed", e)
    return fallback
  }
}

export function saveLlmMultiConfig(config: LlmMultiConfig) {
  localStorage.setItem(LLM_MULTI_CONFIG_STORAGE_KEY, JSON.stringify(config))
}

export function clearLlmMultiConfig() {
  localStorage.removeItem(LLM_MULTI_CONFIG_STORAGE_KEY)
}

function migrateV1ToV2(v1: Partial<LlmConfig>, fallback: LlmMultiConfig): LlmMultiConfig {
  const provider = isLlmProvider(v1.provider) ? v1.provider : "openai"
  const timestamp = now()
  const id = createId()
  const hasKey = typeof v1.apiKey === "string" && v1.apiKey.trim() !== ""

  const entry: LlmProvider = {
    id,
    name: getDefaultProviderName(provider, typeof v1.model === "string" ? v1.model : ""),
    provider,
    endpoint: typeof v1.endpoint === "string" ? v1.endpoint : "",
    apiKey: typeof v1.apiKey === "string" ? v1.apiKey : "",
    model: typeof v1.model === "string" ? v1.model : "",
    proxyEnabled: typeof v1.proxyEnabled === "boolean" ? v1.proxyEnabled : true,
    proxyUrl: typeof v1.proxyUrl === "string" ? v1.proxyUrl : "",
    proxyKey: typeof v1.proxyKey === "string" ? v1.proxyKey : "",
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  return {
    version: 2,
    providers: hasKey ? [entry] : [],
    assignments: hasKey ? { parse: id, fill: id } : { parse: null, fill: null },
  }
}

function getDefaultProviderName(provider: string, model: string): string {
  const label = provider === "openai" ? "OpenAI" : provider === "anthropic" ? "Anthropic" : "Gemini"
  return model ? `${label} (${model})` : label
}

function normalizeMultiConfig(source: unknown, fallback: LlmMultiConfig): LlmMultiConfig {
  if (!source || typeof source !== "object") return fallback
  const s = source as Partial<LlmMultiConfig>
  const providers = Array.isArray(s.providers) ? s.providers.filter(isValidProvider) : []
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
  const lists = Array.isArray(source.lists)
    ? source.lists.map(normalizeList).filter(Boolean)
    : fallback.lists
  const safeLists = deduplicateListIds(lists.length ? (lists as QuestionList[]) : fallback.lists)
  const activeListId =
    typeof source.activeListId === "string" &&
    safeLists.some((list) => list.id === source.activeListId)
      ? source.activeListId
      : safeLists[0].id
  return {
    version: 1,
    lists: safeLists,
    activeListId,
    attempts: Array.isArray(source.attempts) ? source.attempts : [],
    settings: { ...defaultSettings, ...(source.settings ?? {}) },
  }
}

function deduplicateListIds(lists: QuestionList[]): QuestionList[] {
  const seen = new Set<string>()
  return lists.map((list) => {
    if (seen.has(list.id)) {
      return { ...list, id: createId() }
    }
    seen.add(list.id)
    return list
  })
}

export function normalizeList(value: unknown): QuestionList | null {
  if (!value || typeof value !== "object") return null
  const source = value as Partial<QuestionList>
  const timestamp = now()
  return {
    id: typeof source.id === "string" ? source.id : createId(),
    name: typeof source.name === "string" ? source.name : "Unnamed List",
    description: typeof source.description === "string" ? source.description : "",
    questions: Array.isArray(source.questions) ? source.questions.map(normalizeQuestion) : [],
    createdAt: typeof source.createdAt === "string" ? source.createdAt : timestamp,
    updatedAt: timestamp,
  }
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
