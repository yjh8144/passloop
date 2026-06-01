import type {
  AttemptRecord,
  ChoiceOption,
  Question,
  QuestionList,
  QuestionType,
  SortMode,
  TFunc,
} from "./types"
import { questionTypes } from "../utils/constants"

export function createId() {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`
}

export function deduplicateQuestionIds(questions: Question[]): Question[] {
  const seen = new Set<string>()
  return questions.map((question) => {
    if (seen.has(question.id)) {
      return { ...question, id: createId() }
    }
    seen.add(question.id)
    return question
  })
}

const now = () => new Date().toISOString()

export function getTypeLabels(t: TFunc): Record<QuestionType, string> {
  return {
    single: t("typeSingle"),
    multiple: t("typeMultiple"),
    boolean: t("typeBoolean"),
    blank: t("typeBlank"),
    short: t("typeShort"),
  }
}

export function createEmptyQuestion(type: QuestionType = "single"): Question {
  const timestamp = now()
  return {
    id: createId(),
    type,
    title: "",
    options:
      type === "single" || type === "multiple"
        ? ["A", "B", "C", "D"].map((label) => ({ id: createId(), label, text: "" }))
        : [],
    answer: type === "multiple" || type === "blank" || type === "short" ? [] : "",
    explanation: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function normalizeQuestion(value: unknown, index = 0): Question {
  const timestamp = now()
  if (!value || typeof value !== "object") {
    return { ...createEmptyQuestion(), title: `Question ${index + 1}`, updatedAt: timestamp }
  }
  const source = value as Record<string, unknown>
  const type = normalizeType(source.type ?? source.questionType ?? source.kind, source)
  const rawTitle = asString(source.title ?? source.name ?? source.no, "")
  const rawPrompt = asString(
    source.prompt ?? source.question ?? source.stem ?? source.content ?? source.text,
    "",
  )
  const isDefaultTitle = !rawTitle || rawTitle === "New Question"
  const title =
    isDefaultTitle && rawPrompt ? rawPrompt : rawTitle || rawPrompt || `Question ${index + 1}`
  const rawOptions = source.options ?? source.choices ?? source.items
  return {
    id: asString(source.id, createId()),
    type,
    title,
    options: normalizeOptions(rawOptions, type),
    answer: normalizeAnswer(source.answer ?? source.answers ?? source.correctAnswer, type),
    explanation: asString(source.explanation ?? source.analysis ?? source.resolve, ""),
    hint: typeof source.hint === "string" ? source.hint : undefined,
    createdAt: asString(source.createdAt, timestamp),
    updatedAt: timestamp,
  }
}

function asString(value: unknown, fallback: string) {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  return fallback
}

function normalizeType(value: unknown, source: Record<string, unknown>): QuestionType {
  const text = String(value ?? "").toLowerCase()
  if (["single", "radio", "choice", "单选题", "单选"].includes(text)) return "single"
  if (["multiple", "checkbox", "多选题", "多选"].includes(text)) return "multiple"
  if (["boolean", "judge", "truefalse", "判断题", "判断"].includes(text)) return "boolean"
  if (["blank", "fill", "填空题", "填空"].includes(text)) return "blank"
  if (["short", "essay", "answer", "简答题", "简答"].includes(text)) return "short"
  if (Array.isArray(source.options ?? source.choices)) return "single"
  return "short"
}

function normalizeOptions(value: unknown, type: QuestionType): ChoiceOption[] {
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
    const source = item as Record<string, unknown>
    return {
      id: asString(source.id, createId()),
      label: asString(source.label ?? source.key, optionLabel(index)),
      text: asString(source.text ?? source.content ?? source.value, ""),
    }
  })
}

function optionLabel(index: number) {
  return String.fromCharCode(65 + index)
}

function normalizeAnswer(value: unknown, type: QuestionType): string | string[] {
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

export function parseQuestionJson(text: string): QuestionList[] {
  const parsed = JSON.parse(text)
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.lists)) {
    return parsed.lists.map((item: unknown) => normalizeImportedList(item))
  }
  if (Array.isArray(parsed)) {
    return [normalizeImportedList({ name: "Imported List", questions: parsed })]
  }
  if (Array.isArray(parsed.questions)) {
    return [normalizeImportedList(parsed)]
  }
  if (parsed.question || parsed.prompt || parsed.stem) {
    return [normalizeImportedList({ name: "Imported List", questions: [parsed] })]
  }
  throw new Error("No question array found in JSON.")
}

export function normalizeImportedList(value: unknown): QuestionList {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
  const timestamp = now()
  return {
    id: asString(source.id, createId()),
    name: asString(source.name ?? source.title, "Imported List"),
    description: asString(source.description ?? source.desc, ""),
    questions: Array.isArray(source.questions)
      ? deduplicateQuestionIds(source.questions.map((item, index) => normalizeQuestion(item, index)))
      : [],
    createdAt: asString(source.createdAt, timestamp),
    updatedAt: timestamp,
  }
}

function seededRandom(seed: number) {
  return function () {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff
    return (seed >>> 0) / 0xffffffff
  }
}

export function sortQuestions(
  questions: Question[],
  mode: SortMode,
  locale?: string,
  typeOrder?: QuestionType[],
  seed?: number,
) {
  if (mode === "manual") return questions
  const copy = [...questions]
  if (mode === "random") {
    const rng = seededRandom(seed ?? Date.now())
    return copy
      .map((question) => ({ question, score: rng() }))
      .sort((a, b) => a.score - b.score)
      .map((item) => item.question)
  }
  const loc = locale ?? "zh"
  if (mode === "name") return copy.sort((a, b) => a.title.localeCompare(b.title, loc))
  const order = typeOrder ?? questionTypes
  if (mode === "type") {
    return copy.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))
  }
  const rng = seededRandom(seed ?? Date.now())
  return copy
    .map((question) => ({ question, score: rng() }))
    .sort((a, b) => {
      const byType = order.indexOf(a.question.type) - order.indexOf(b.question.type)
      return byType !== 0 ? byType : a.score - b.score
    })
    .map((item) => item.question)
}

export function isAnswerCorrect(question: Question, answer: string | string[]) {
  if (question.type === "blank" || question.type === "short") {
    const expected = toArray(question.answer)
    const actual = toArray(answer).map(normalizeText)
    if (expected.length !== actual.length) return false
    return expected.every((item, i) => {
      const alternatives = item.split("|").map((s) => normalizeText(s))
      return alternatives.includes(actual[i])
    })
  }
  if (question.type === "multiple") {
    const expected = toArray(question.answer).map(normalizeText).sort()
    const actual = toArray(answer).map(normalizeText).sort()
    return (
      expected.length === actual.length && expected.every((item, index) => item === actual[index])
    )
  }
  return normalizeText(question.answer) === normalizeText(answer)
}

export function toArray(value: string | string[]) {
  return Array.isArray(value) ? value : value ? [value] : []
}

export function normalizeText(value: string | string[]) {
  return toArray(value).join(" ").trim().replace(/\s+/g, " ").toLowerCase()
}

export function formatAnswer(value: string | string[]) {
  return Array.isArray(value) ? value.join("、") : value
}

export function getListStats(list: QuestionList, attempts: AttemptRecord[]) {
  const related = attempts.filter((attempt) => attempt.listId === list.id)
  const submitted = related.length
  const correct = related.filter((attempt) => attempt.correct).length
  const lastAttemptByQuestion = new Map<string, boolean>()
  for (const attempt of related) {
    lastAttemptByQuestion.set(attempt.questionId, attempt.correct)
  }
  const wrongQuestionIds = new Set(
    [...lastAttemptByQuestion.entries()].filter(([, wasCorrect]) => !wasCorrect).map(([id]) => id),
  )
  const attemptedQuestionIds = new Set(related.map((attempt) => attempt.questionId))
  const avgTime = submitted
    ? Math.round(
        related.reduce((total, attempt) => total + attempt.elapsedMs, 0) / submitted / 1000,
      )
    : 0
  return {
    submitted,
    correct,
    total: list.questions.length,
    attempted: attemptedQuestionIds.size,
    wrong: wrongQuestionIds.size,
    accuracy: submitted ? Math.round((correct / submitted) * 100) : 0,
    avgTime,
    wrongQuestionIds,
  }
}
