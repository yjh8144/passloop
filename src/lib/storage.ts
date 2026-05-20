import type { AppData, LlmConfig, QuestionList, Settings } from "./types"
import { createId, normalizeQuestion } from "./question"

export const STORAGE_KEY = "passloop.app.v1"
export const LLM_CONFIG_STORAGE_KEY = "passloop.llm-config.v1"

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

export function createEmptyQuestionList(name = "默认题单"): QuestionList {
  const timestamp = now()
  return {
    id: createId(),
    name,
    description: "从 JSON 导入题目，或手动新增题目。",
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
  } catch {
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
      proxyUrl: typeof source.proxyUrl === "string" ? source.proxyUrl : fallback.proxyUrl,
      proxyKey: typeof source.proxyKey === "string" ? source.proxyKey : fallback.proxyKey,
    }
  } catch {
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
      proxyUrl: config.proxyUrl,
      proxyKey: config.proxyKey,
    }),
  )
}

export function clearLlmConfig() {
  localStorage.removeItem(LLM_CONFIG_STORAGE_KEY)
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
    name: typeof source.name === "string" ? source.name : "未命名题单",
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
