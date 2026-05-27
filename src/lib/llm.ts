import type { LlmConfig, Question } from "./types"
import { parseQuestionJson } from "./question"
import { debugError } from "./debug"

function assertConfigValid(apiKey: string, model: string, endpoint: string): void {
  if (!apiKey) throw new Error("请填写 API Key。")
  if (!model) throw new Error("请填写模型名称。")
  if (!endpoint) throw new Error("请填写 API 地址。")
}

type ProxyConfig = Pick<LlmConfig, "proxyEnabled" | "proxyUrl" | "proxyKey">

class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NetworkError"
  }
}

function buildProxyUrl(targetUrl: string, config: ProxyConfig): string {
  if (!config.proxyEnabled || !config.proxyUrl) return targetUrl
  const proxy = config.proxyUrl.replace(/\/+$/, "")
  return `${proxy}/?url=${encodeURIComponent(targetUrl)}`
}

function proxyHeaders(config: ProxyConfig): Record<string, string> {
  if (!config.proxyEnabled || !config.proxyUrl || !config.proxyKey) return {}
  return { "X-Proxy-Key": config.proxyKey }
}

async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetch(url, options)
  } catch (error) {
    if (error instanceof TypeError) {
      throw new NetworkError(
        "网络请求失败，可能被浏览器 CORS 策略拦截。请确认 API 地址支持跨域访问，或使用支持 CORS 的代理。",
      )
    }
    throw error
  }
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `请求失败：${response.status}`)
  }
  return response
}

async function fetchWithProxyFallback(
  targetUrl: string,
  options: RequestInit | undefined,
  config: ProxyConfig,
): Promise<Response> {
  const proxyActive = config.proxyEnabled && !!config.proxyUrl
  const proxiedUrl = buildProxyUrl(targetUrl, config)
  const mergedOptions: RequestInit = {
    ...options,
    headers: { ...options?.headers, ...proxyHeaders(config) },
  }

  try {
    return await safeFetch(proxiedUrl, mergedOptions)
  } catch (error) {
    if (!(error instanceof NetworkError) || !proxyActive) throw error
    try {
      return await safeFetch(targetUrl, options)
    } catch (retryError) {
      if (retryError instanceof NetworkError) throw error
      throw retryError
    }
  }
}

export async function fetchViaProxy(
  targetUrl: string,
  config: ProxyConfig,
  options?: RequestInit,
): Promise<Response> {
  return fetchWithProxyFallback(targetUrl, options, config)
}

const SYSTEM_PROMPT = `你是题库整理助手。请把用户提供的未整理题目转换为 PassLoop 标准 JSON。
只返回 JSON，不要 Markdown。
输出结构为：{"name":"题单名称","description":"","questions":[...]}。
每题字段：type(single|multiple|boolean|blank|short), title, prompt, options, answer, explanation, hint。
options 使用 [{"label":"A","text":"选项内容"}]。
解析字段 explanation 可以为空。`

export async function parseWithLlm(input: string, config: LlmConfig) {
  const fullText = await streamParseLlm(input, config, "both", () => {})
  return parseQuestionJson(extractJsonText(fullText))
}

export async function streamParseLlm(
  input: string,
  config: LlmConfig,
  mode: "both" | "answer" | "explanation" | "none",
  onChunk: (accumulated: string) => void,
): Promise<string> {
  const fillAnswer = mode === "both" || mode === "answer"
  const fillExplanation = mode === "both" || mode === "explanation"
  const prompt = `${SYSTEM_PROMPT}
补充答案：${fillAnswer ? "是" : "否"}
补充解析：${fillExplanation ? "是" : "否"}

原始题目：
${input}`

  if (config.provider === "gemini") {
    return streamGemini(prompt, config, onChunk)
  }
  if (config.provider === "anthropic") {
    return streamAnthropic(prompt, config, onChunk)
  }
  return streamOpenAiCompatible(prompt, config, onChunk)
}

async function streamOpenAiCompatible(
  prompt: string,
  config: LlmConfig,
  onChunk: (accumulated: string) => void,
) {
  const endpoint = normalizeOpenAiChatEndpoint(
    config.endpoint.trim() || "https://api.openai.com/v1/chat/completions",
  )
  const model = config.model.trim() || "gpt-4.1-mini"
  assertConfigValid(config.apiKey, model, endpoint)
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: "Return valid JSON only." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    stream: true,
  }
  const response = await fetchWithProxyFallback(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    },
    config,
  )
  return readSSEStream(
    response,
    (data) => {
      if (data === "[DONE]") return null
      try {
        const parsed = JSON.parse(data)
        return parsed.choices?.[0]?.delta?.content ?? ""
      } catch (e) {
        debugError("OpenAI SSE parse error", data, e)
        return ""
      }
    },
    onChunk,
  )
}

async function streamGemini(
  prompt: string,
  config: LlmConfig,
  onChunk: (accumulated: string) => void,
) {
  const model = config.model.trim() || "gemini-1.5-pro"
  const baseEndpoint =
    config.endpoint.trim() ||
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${config.apiKey}`
  assertConfigValid(config.apiKey, model, baseEndpoint)
  const endpoint = baseEndpoint.includes("streamGenerateContent")
    ? baseEndpoint
    : baseEndpoint.replace(":generateContent", ":streamGenerateContent").replace(/\?/, "?alt=sse&")
  const response = await fetchWithProxyFallback(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
    },
    config,
  )
  return readSSEStream(
    response,
    (data) => {
      try {
        const parsed = JSON.parse(data)
        return (
          parsed.candidates?.[0]?.content?.parts
            ?.map((p: { text?: string }) => p.text ?? "")
            .join("") ?? ""
        )
      } catch (e) {
        debugError("Gemini SSE parse error", data, e)
        return ""
      }
    },
    onChunk,
  )
}

async function streamAnthropic(
  prompt: string,
  config: LlmConfig,
  onChunk: (accumulated: string) => void,
) {
  const endpoint = config.endpoint.trim() || "https://api.anthropic.com/v1/messages"
  const model = config.model.trim() || "claude-sonnet-4-20250514"
  assertConfigValid(config.apiKey, model, endpoint)
  const response = await fetchWithProxyFallback(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        temperature: 0.2,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
    },
    config,
  )
  return readSSEStream(
    response,
    (data) => {
      try {
        const parsed = JSON.parse(data)
        if (parsed.type === "content_block_delta") {
          return parsed.delta?.text ?? ""
        }
        if (parsed.type === "message_stop") return null
        return ""
      } catch (e) {
        debugError("Anthropic SSE parse error", data, e)
        return ""
      }
    },
    onChunk,
  )
}

async function readSSEStream(
  response: Response,
  extractDelta: (data: string) => string | null,
  onChunk: (accumulated: string) => void,
): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error("无法读取响应流。")
  const decoder = new TextDecoder()
  let accumulated = ""
  let buffer = ""
  let streamDone = false
  while (!streamDone) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    for (const line of lines) {
      if (!line.startsWith("data:")) continue
      const data = line.slice(5).trim()
      if (!data) continue
      const delta = extractDelta(data)
      if (delta === null) {
        streamDone = true
        break
      }
      if (delta) {
        accumulated += delta
        onChunk(accumulated)
      }
    }
  }
  return accumulated
}

export async function fillAnswersWithLlm(
  questions: Question[],
  config: LlmConfig,
  mode: "answer" | "explanation" | "both",
  onChunk: (accumulated: string) => void,
): Promise<Question[]> {
  const modeInstruction =
    mode === "answer"
      ? '只补充答案，不需要补充解析。每题返回：{"id":"原题id","answer":"答案"}。'
      : mode === "explanation"
        ? '只补充解析，不需要补充答案。每题返回：{"id":"原题id","explanation":"解析"}。'
        : '同时补充答案和解析。每题返回：{"id":"原题id","answer":"答案","explanation":"解析"}。'

  const fillPrompt = `你是题库整理助手。请为以下题目${mode === "answer" ? "补充答案" : mode === "explanation" ? "补充解析" : "补充答案和解析"}。
只返回 JSON 数组，不要 Markdown。
${modeInstruction}
多选题/填空题的答案用数组，如 ["A","B"]。
判断题答案用 "T" 或 "F"。

题目列表：
${JSON.stringify(
  questions.map((q) => ({
    id: q.id,
    type: q.type,
    title: q.title,
    prompt: q.prompt,
    options: q.options.map((o) => ({ label: o.label, text: o.text })),
  })),
  null,
  2,
)}`

  const fullText = await (config.provider === "gemini"
    ? streamGemini(fillPrompt, config, onChunk)
    : config.provider === "anthropic"
      ? streamAnthropic(fillPrompt, config, onChunk)
      : streamOpenAiCompatible(fillPrompt, config, onChunk))

  const parsed = JSON.parse(extractJsonText(fullText))
  const results: Array<{ id?: string; answer?: unknown; explanation?: string }> = Array.isArray(
    parsed,
  )
    ? parsed
    : []
  const resultMap = new Map(results.map((r) => [r.id, r]))

  return questions.map((q, index) => {
    const fill = resultMap.get(q.id) ?? results[index]
    if (!fill) return q
    let answer = q.answer
    let explanation = q.explanation
    if (mode !== "explanation" && fill.answer !== undefined) {
      answer =
        q.type === "multiple" || q.type === "blank"
          ? Array.isArray(fill.answer)
            ? fill.answer.map(String)
            : String(fill.answer)
                .split("|")
                .map((s) => s.trim())
          : String(fill.answer)
    }
    if (mode !== "answer" && typeof fill.explanation === "string" && fill.explanation) {
      explanation = fill.explanation
    }
    return { ...q, answer, explanation, updatedAt: new Date().toISOString() }
  })
}

export async function fetchModelList(config: LlmConfig): Promise<string[]> {
  if (!config.apiKey.trim()) throw new Error("请先填写 API Key。")
  if (config.provider === "anthropic") {
    return [
      "claude-opus-4-20250514",
      "claude-sonnet-4-20250514",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ]
  }
  if (config.provider === "gemini") {
    const baseUrl = config.endpoint.trim()
      ? config.endpoint.trim().replace(/\/models.*$/, "")
      : "https://generativelanguage.googleapis.com/v1beta"
    const response = await fetchWithProxyFallback(
      `${baseUrl}/models?key=${config.apiKey}`,
      {
        headers: {},
      },
      config,
    )
    const payload = await response.json()
    return (payload.models ?? [])
      .map((m: { name?: string }) => (m.name ?? "").replace(/^models\//, ""))
      .filter(Boolean)
  }
  const raw = config.endpoint.trim() || "https://api.openai.com/v1"
  const base = normalizeModelsEndpoint(raw)
  const response = await fetchWithProxyFallback(
    base,
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    },
    config,
  )
  const payload = await response.json()
  return (payload.data ?? [])
    .map((m: { id?: string }) => m.id ?? "")
    .filter(Boolean)
    .sort()
}

function normalizeModelsEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint)
    const path = url.pathname.replace(/\/+$/, "")
    if (path.endsWith("/models")) return url.toString()
    if (path.endsWith("/chat/completions")) {
      url.pathname = path.replace(/\/chat\/completions$/, "/models")
      return url.toString()
    }
    if (!path || path === "/") {
      url.pathname = "/v1/models"
      return url.toString()
    }
    if (path === "/v1") {
      url.pathname = "/v1/models"
      return url.toString()
    }
    url.pathname = `${path}/models`
    return url.toString()
  } catch (e) {
    debugError("normalizeModelsEndpoint failed", endpoint, e)
    return endpoint
  }
}

export async function testLlmConnection(config: LlmConfig): Promise<string> {
  if (config.provider === "gemini") {
    const model = config.model.trim() || "gemini-1.5-pro"
    const endpoint =
      config.endpoint.trim() ||
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`
    assertConfigValid(config.apiKey, model, endpoint)
    await fetchWithProxyFallback(
      endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "hi" }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      },
      config,
    )
    return model
  }
  if (config.provider === "anthropic") {
    const endpoint = config.endpoint.trim() || "https://api.anthropic.com/v1/messages"
    const model = config.model.trim() || "claude-sonnet-4-20250514"
    assertConfigValid(config.apiKey, model, endpoint)
    await fetchWithProxyFallback(
      endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 10,
          messages: [{ role: "user", content: "hi" }],
        }),
      },
      config,
    )
    return model
  }
  const endpoint = normalizeOpenAiChatEndpoint(
    config.endpoint.trim() || "https://api.openai.com/v1/chat/completions",
  )
  const model = config.model.trim() || "gpt-4.1-mini"
  assertConfigValid(config.apiKey, model, endpoint)
  await fetchWithProxyFallback(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 10,
      }),
    },
    config,
  )
  return model
}

function normalizeOpenAiChatEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint)
    const path = url.pathname.replace(/\/+$/, "")
    if (path.endsWith("/chat/completions")) return url.toString()
    if (!path || path === "/" || path === "/v1") {
      url.pathname = `${path === "/v1" ? "/v1" : ""}/chat/completions`
      return url.toString()
    }
    if (path.endsWith("/openai") || path.endsWith("/openai/v1")) {
      url.pathname = `${path}/chat/completions`
      return url.toString()
    }
    return url.toString()
  } catch (e) {
    debugError("normalizeChatEndpoint failed", endpoint, e)
    return endpoint
  }
}

export function extractJsonText(text: string) {
  const trimmed = text.trim()
  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim()
    if (withoutFence) return withoutFence
  }
  const firstObject = trimmed.indexOf("{")
  const firstArray = trimmed.indexOf("[")
  const startsAt =
    firstObject === -1
      ? firstArray
      : firstArray === -1
        ? firstObject
        : Math.min(firstObject, firstArray)
  if (startsAt <= 0) return trimmed
  const lastObject = trimmed.lastIndexOf("}")
  const lastArray = trimmed.lastIndexOf("]")
  const endsAt = Math.max(lastObject, lastArray)
  return endsAt > startsAt ? trimmed.slice(startsAt, endsAt + 1) : trimmed
}
