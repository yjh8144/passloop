import type { LlmConfig, QuestionType } from "../lib/types";

export const questionTypes: QuestionType[] = [
  "single",
  "multiple",
  "boolean",
  "blank",
  "short",
  "composite",
];

export const providerPlaceholders: Record<LlmConfig["provider"], { endpoint: string; model: string }> = {
  openai: { endpoint: "https://api.openai.com/v1/chat/completions", model: "gpt-4.1-mini" },
  gemini: { endpoint: "https://generativelanguage.googleapis.com/v1beta/models/...", model: "gemini-1.5-pro" },
  anthropic: { endpoint: "https://api.anthropic.com/v1/messages", model: "claude-sonnet-4-20250514" },
};

export const defaultLlmConfig: LlmConfig = {
  provider: "openai",
  endpoint: "",
  apiKey: "",
  model: "",
  fillAnswer: true,
  fillExplanation: true,
  proxyUrl: "https://passloop.mtwsf.workers.dev",
  proxyKey: "d5c3cdc6210f8c9430c334c897bd883488f76d23b7d423d10e190a3d504e45d3",
};

export const ANSWERS_SESSION_KEY = "passloop.session.answers";
export const INDEX_SESSION_KEY = "passloop.session.index";
export const ONBOARDING_KEY = "passloop.onboarding.shown";
