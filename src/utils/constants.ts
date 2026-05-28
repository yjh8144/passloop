import type { LlmConfig, LlmMultiConfig, ProxySettings, QuestionType } from "../lib/types"

export const questionTypes: QuestionType[] = [
  "single",
  "multiple",
  "boolean",
  "blank",
  "short",
]

export const providerPlaceholders: Record<
  LlmConfig["provider"],
  { endpoint: string; model: string }
> = {
  openai: { endpoint: "https://api.openai.com/v1/chat/completions", model: "gpt-4.1-mini" },
  gemini: {
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/...",
    model: "gemini-1.5-pro",
  },
  anthropic: {
    endpoint: "https://api.anthropic.com/v1/messages",
    model: "claude-sonnet-4-20250514",
  },
}

export const defaultProxySettings: ProxySettings = {
  proxyEnabled: true,
  proxyUrl: "http://121.40.35.52:9362",
  proxyKey: "19b0451c81fb111df6704051c438c0d868bf661a27e816a287fe5aa28a1a2143",
}

export const defaultLlmConfig: LlmConfig = {
  provider: "openai",
  endpoint: "",
  apiKey: "",
  model: "",
  fillAnswer: true,
  fillExplanation: true,
  proxyEnabled: true,
  proxyUrl: "http://121.40.35.52:9362",
  proxyKey: "19b0451c81fb111df6704051c438c0d868bf661a27e816a287fe5aa28a1a2143",
}

export const PRESET_PROXIES: Array<{ name: string; url: string; key: string }> = [
  {
    name: "Default (Cloudflare Workers)",
    url: "https://passloop.mtwsf.workers.dev",
    key: "d5c3cdc6210f8c9430c334c897bd883488f76d23b7d423d10e190a3d504e45d3",
  },
  {
    name: "Backup (Aliyun ECS)",
    url: "http://121.40.35.52:9362",
    key: "19b0451c81fb111df6704051c438c0d868bf661a27e816a287fe5aa28a1a2143",
  },
]

export const defaultLlmMultiConfig: LlmMultiConfig = {
  version: 2,
  providers: [],
  assignments: { parse: null, fill: null },
}

export const ANSWERS_SESSION_KEY = "passloop.session.answers"
export const INDEX_SESSION_KEY = "passloop.session.index"
export const ONBOARDING_KEY = "passloop.onboarding.shown"
