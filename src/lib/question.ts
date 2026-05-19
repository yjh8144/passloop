import type {
  AttemptRecord,
  ChoiceOption,
  Question,
  QuestionList,
  QuestionType,
  SortMode,
} from "./types";

export function createId() {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`;
}

const now = () => new Date().toISOString();

export const typeLabels: Record<QuestionType, string> = {
  single: "单选",
  multiple: "多选",
  boolean: "判断",
  blank: "填空",
  short: "简答",
  composite: "综合",
};

export function createEmptyQuestion(type: QuestionType = "single"): Question {
  const timestamp = now();
  return {
    id: createId(),
    type,
    title: "新题目",
    prompt: "",
    options:
      type === "single" || type === "multiple"
        ? ["A", "B", "C", "D"].map((label) => ({ id: createId(), label, text: "" }))
        : [],
    answer: type === "multiple" || type === "blank" ? [] : "",
    explanation: "",
    subQuestions: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function normalizeQuestion(value: unknown, index = 0): Question {
  const timestamp = now();
  if (!value || typeof value !== "object") {
    return { ...createEmptyQuestion(), title: `题目 ${index + 1}`, updatedAt: timestamp };
  }
  const source = value as Record<string, unknown>;
  const type = normalizeType(source.type ?? source.questionType ?? source.kind, source);
  const title = asString(source.title ?? source.name ?? source.no, `题目 ${index + 1}`);
  const prompt = asString(
    source.prompt ?? source.question ?? source.stem ?? source.content ?? source.text,
    "",
  );
  const rawOptions = source.options ?? source.choices ?? source.items;
  return {
    id: asString(source.id, createId()),
    type,
    title,
    prompt,
    options: normalizeOptions(rawOptions, type),
    answer: normalizeAnswer(source.answer ?? source.answers ?? source.correctAnswer, type),
    explanation: asString(source.explanation ?? source.analysis ?? source.resolve, ""),
    hint: typeof source.hint === "string" ? source.hint : undefined,
    subQuestions: Array.isArray(source.subQuestions ?? source.children)
      ? ((source.subQuestions ?? source.children) as unknown[]).map(normalizeQuestion)
      : [],
    createdAt: asString(source.createdAt, timestamp),
    updatedAt: timestamp,
  };
}

function asString(value: unknown, fallback: string) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function normalizeType(value: unknown, source: Record<string, unknown>): QuestionType {
  const text = String(value ?? "").toLowerCase();
  if (["single", "radio", "choice", "单选题", "单选"].includes(text)) return "single";
  if (["multiple", "checkbox", "多选题", "多选"].includes(text)) return "multiple";
  if (["boolean", "judge", "truefalse", "判断题", "判断"].includes(text)) return "boolean";
  if (["blank", "fill", "填空题", "填空"].includes(text)) return "blank";
  if (["short", "essay", "answer", "简答题", "简答"].includes(text)) return "short";
  if (["composite", "综合题", "综合"].includes(text)) return "composite";
  if (Array.isArray(source.subQuestions ?? source.children)) return "composite";
  if (Array.isArray(source.options ?? source.choices)) return "single";
  return "short";
}

function normalizeOptions(value: unknown, type: QuestionType): ChoiceOption[] {
  if (type === "boolean") {
    return [
      { id: createId(), label: "T", text: "正确" },
      { id: createId(), label: "F", text: "错误" },
    ];
  }
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    if (typeof item === "string") {
      return { id: createId(), label: optionLabel(index), text: item };
    }
    const source = item as Record<string, unknown>;
    return {
      id: asString(source.id, createId()),
      label: asString(source.label ?? source.key, optionLabel(index)),
      text: asString(source.text ?? source.content ?? source.value, ""),
    };
  });
}

function optionLabel(index: number) {
  return String.fromCharCode(65 + index);
}

function normalizeAnswer(value: unknown, type: QuestionType): string | string[] {
  if (type === "multiple" || type === "blank") {
    if (Array.isArray(value)) return value.map((item) => String(item));
    if (typeof value === "string") {
      return value.includes("|") ? value.split("|").map((item) => item.trim()) : [value];
    }
    return [];
  }
  if (typeof value === "boolean") return value ? "T" : "F";
  if (Array.isArray(value)) return value.join("、");
  return asString(value, "");
}

export function parseQuestionJson(text: string): QuestionList[] {
  const parsed = JSON.parse(text);
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.lists)) {
    return parsed.lists.map((item: unknown) => normalizeImportedList(item));
  }
  if (Array.isArray(parsed)) {
    return [normalizeImportedList({ name: "导入题单", questions: parsed })];
  }
  if (Array.isArray(parsed.questions)) {
    return [normalizeImportedList(parsed)];
  }
  if (parsed.question || parsed.prompt || parsed.stem) {
    return [normalizeImportedList({ name: "导入题单", questions: [parsed] })];
  }
  throw new Error("JSON 中没有找到题目数组。");
}

export function normalizeImportedList(value: unknown): QuestionList {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const timestamp = now();
  return {
    id: asString(source.id, createId()),
    name: asString(source.name ?? source.title, "导入题单"),
    description: asString(source.description ?? source.desc, ""),
    questions: Array.isArray(source.questions)
      ? source.questions.map((item, index) => normalizeQuestion(item, index))
      : [],
    createdAt: asString(source.createdAt, timestamp),
    updatedAt: timestamp,
  };
}

export function sortQuestions(questions: Question[], mode: SortMode) {
  if (mode === "manual") return questions;
  const copy = [...questions];
  if (mode === "random") {
    return copy
      .map((question) => ({ question, score: seededScore(question.id) }))
      .sort((a, b) => a.score - b.score)
      .map((item) => item.question);
  }
  if (mode === "name") return copy.sort((a, b) => a.title.localeCompare(b.title, "zh"));
  return copy.sort((a, b) => typeLabels[a.type].localeCompare(typeLabels[b.type], "zh"));
}

function seededScore(value: string) {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

export function isAnswerCorrect(question: Question, answer: string | string[]) {
  if (question.type === "short") {
    return normalizeText(answer).length > 0 && normalizeText(answer) === normalizeText(question.answer);
  }
  if (question.type === "multiple" || question.type === "blank") {
    const expected = toArray(question.answer).map(normalizeText).sort();
    const actual = toArray(answer).map(normalizeText).sort();
    return expected.length === actual.length && expected.every((item, index) => item === actual[index]);
  }
  return normalizeText(question.answer) === normalizeText(answer);
}

export function toArray(value: string | string[]) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

export function normalizeText(value: string | string[]) {
  return toArray(value).join(" ").trim().replace(/\s+/g, " ").toLowerCase();
}

export function formatAnswer(value: string | string[]) {
  return Array.isArray(value) ? value.join("、") : value;
}

export function getListStats(list: QuestionList, attempts: AttemptRecord[]) {
  const related = attempts.filter((attempt) => attempt.listId === list.id);
  const submitted = related.length;
  const correct = related.filter((attempt) => attempt.correct).length;
  const wrongQuestionIds = new Set(
    related.filter((attempt) => !attempt.correct).map((attempt) => attempt.questionId),
  );
  const attemptedQuestionIds = new Set(related.map((attempt) => attempt.questionId));
  const avgTime = submitted
    ? Math.round(related.reduce((total, attempt) => total + attempt.elapsedMs, 0) / submitted / 1000)
    : 0;
  return {
    submitted,
    correct,
    total: list.questions.length,
    attempted: attemptedQuestionIds.size,
    wrong: wrongQuestionIds.size,
    accuracy: submitted ? Math.round((correct / submitted) * 100) : 0,
    avgTime,
    wrongQuestionIds,
  };
}
