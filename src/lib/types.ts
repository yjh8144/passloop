export type QuestionType = "single" | "multiple" | "boolean" | "blank" | "short" | "composite"

export type SortMode = "manual" | "random" | "name" | "type"
export type ViewMode = "single" | "paper"
export type PracticeMode = "practice" | "memorize"
export type ThemeName = "mint" | "paper" | "night"
export type LanguageName = "zh" | "en" | "ja" | "ko" | "fr"

export type TFunc = (key: string, ...args: (string | number)[]) => string

export interface ChoiceOption {
  id: string
  label: string
  text: string
}

export interface Question {
  id: string
  type: QuestionType
  title: string
  prompt: string
  options: ChoiceOption[]
  answer: string | string[]
  explanation: string
  hint?: string
  subQuestions: Question[]
  createdAt: string
  updatedAt: string
}

export interface QuestionList {
  id: string
  name: string
  description: string
  questions: Question[]
  createdAt: string
  updatedAt: string
}

export interface AttemptRecord {
  id: string
  listId: string
  questionId: string
  answer: string | string[]
  correct: boolean
  elapsedMs: number
  submittedAt: string
}

export type SubmitMode = "each" | "paper"
export type RevealMode = "immediate" | "end"

export interface Settings {
  theme: ThemeName
  language: LanguageName
  autoNext: boolean
  viewMode: ViewMode
  practiceMode: PracticeMode
  sortMode: SortMode
  submitMode: SubmitMode
  revealMode: RevealMode
}

export interface AppData {
  version: 1
  lists: QuestionList[]
  activeListId: string
  attempts: AttemptRecord[]
  settings: Settings
}

export interface LlmConfig {
  provider: "openai" | "gemini" | "anthropic"
  endpoint: string
  apiKey: string
  model: string
  fillAnswer: boolean
  fillExplanation: boolean
  proxyUrl: string
  proxyKey: string
}

export interface Toast {
  id: string
  tone: "success" | "error" | "info"
  message: string
  bump?: number
  repeatCount?: number
}
