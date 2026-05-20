import { useState } from "react"
import { Check, Copy, Download, Upload, X } from "lucide-react"
import type { Question, Toast } from "../../lib/types"
import { debugLog } from "../../lib/debug"
import { Segmented } from "../ui/Segmented"

export function SelfFillDialog(props: {
  open: boolean
  questions: Question[]
  mode: "answer" | "explanation" | "both"
  setMode: (mode: "answer" | "explanation" | "both") => void
  onClose: () => void
  onApply: (updated: Question[]) => void
  pushToast: (tone: Toast["tone"], message: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [jsonInput, setJsonInput] = useState("")
  const [validationError, setValidationError] = useState("")

  if (!props.open) return null

  const modeInstruction =
    props.mode === "answer"
      ? '只补充答案，不需要补充解析。每题返回：{"id":"原题id","answer":"答案"}。'
      : props.mode === "explanation"
        ? '只补充解析，不需要补充答案。每题返回：{"id":"原题id","explanation":"解析"}。'
        : '同时补充答案和解析。每题返回：{"id":"原题id","answer":"答案","explanation":"解析"}。'

  const questionsData = JSON.stringify(
    props.questions.map((q) => ({
      id: q.id,
      type: q.type,
      title: q.title,
      prompt: q.prompt,
      options: q.options.map((o) => ({ label: o.label, text: o.text })),
    })),
    null,
    2,
  )

  const prompt = `你是题库整理助手。请为以下题目${props.mode === "answer" ? "补充答案" : props.mode === "explanation" ? "补充解析" : "补充答案和解析"}。
只返回 JSON 数组，不要 Markdown。
${modeInstruction}
多选题/填空题的答案用数组，如 ["A","B"]。
判断题答案用 "T" 或 "F"。

题目列表：
${questionsData}`

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownload = () => {
    const blob = new Blob([prompt], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "passloop-fill-prompt.txt"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleApply = () => {
    setValidationError("")
    const trimmed = jsonInput.trim()
    if (!trimmed) {
      setValidationError("请粘贴 AI 返回的 JSON。")
      return
    }
    let jsonText = trimmed
    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim()
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      debugLog("SelfFill JSON parse error", { textLength: jsonText.length })
      setValidationError("JSON 格式错误，请检查是否完整复制了 AI 的输出。")
      return
    }
    const results: Array<{ id?: string; answer?: unknown; explanation?: string }> = Array.isArray(
      parsed,
    )
      ? parsed
      : []
    if (!results.length) {
      debugLog("SelfFill JSON empty array")
      setValidationError('JSON 应为数组格式，如 [{"id":"...","answer":"..."}]。')
      return
    }
    const questionIds = new Set(props.questions.map((q) => q.id))
    const matched = results.filter((r) => r.id && questionIds.has(r.id))
    if (!matched.length) {
      debugLog("SelfFill JSON no match", {
        resultCount: results.length,
        questionCount: props.questions.length,
      })
      setValidationError(
        `未匹配到任何题目。请确认 JSON 中的 id 字段与题目 id 一致（共 ${props.questions.length} 题）。`,
      )
      return
    }
    debugLog("SelfFill JSON validated", {
      matched: matched.length,
      total: results.length,
      mode: props.mode,
    })
    const resultMap = new Map(results.map((r) => [r.id, r]))
    const updated = props.questions.map((q, index) => {
      const fill = resultMap.get(q.id) ?? results[index]
      if (!fill) return q
      let answer = q.answer
      let explanation = q.explanation
      if (props.mode !== "explanation" && fill.answer !== undefined) {
        answer =
          q.type === "multiple" || q.type === "blank"
            ? Array.isArray(fill.answer)
              ? fill.answer.map(String)
              : String(fill.answer)
                  .split("|")
                  .map((s) => s.trim())
            : String(fill.answer)
      }
      if (props.mode !== "answer" && typeof fill.explanation === "string" && fill.explanation) {
        explanation = fill.explanation
      }
      return { ...q, answer, explanation, updatedAt: new Date().toISOString() }
    })
    props.onApply(updated)
  }

  return (
    <div className="modal-overlay" onClick={props.onClose}>
      <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>自助补充答案/解析</h2>
          <button className="icon-button" onClick={props.onClose}>
            <X size={18} />
          </button>
        </div>
        <p className="modal-desc">
          复制 Prompt 发给你的 AI，将返回的 JSON 粘贴到下方，校验通过后会自动应用到当前题单。
        </p>
        <div className="self-gen-options">
          <span>补充内容：</span>
          <Segmented
            value={props.mode}
            options={[
              ["both", "答案 + 解析"],
              ["answer", "仅答案"],
              ["explanation", "仅解析"],
            ]}
            onChange={(v) => props.setMode(v as "answer" | "explanation" | "both")}
          />
        </div>
        <div className="self-gen-prompt-box">
          <div className="self-gen-prompt-header">
            <strong>
              Prompt（含当前题单 {props.questions.length} 题，{prompt.length.toLocaleString()} 字）
            </strong>
            <div className="self-gen-prompt-actions">
              <button onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check size={15} /> 已复制
                  </>
                ) : (
                  <>
                    <Copy size={15} /> 复制
                  </>
                )}
              </button>
              <button onClick={handleDownload}>
                <Download size={15} /> 下载 TXT
              </button>
            </div>
          </div>
          {prompt.length > 10000 && (
            <p className="prompt-length-warning">
              内容较长（超过 1 万字），建议下载 TXT 文件后以附件形式发送给 AI。
            </p>
          )}
          <pre className="self-gen-prompt-text">{prompt}</pre>
        </div>
        <div className="field-label">
          <div className="json-input-header">
            <span>粘贴或上传 AI 返回的 JSON</span>
            <label className="upload-json-button">
              <Upload size={14} /> 上传 JSON
              <input
                type="file"
                accept=".json,.txt,text/plain,application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ""
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    const text = String(reader.result ?? "")
                    debugLog("SelfFill upload JSON", { fileName: file.name, length: text.length })
                    setJsonInput(text)
                    setValidationError("")
                  }
                  reader.readAsText(file)
                }}
              />
            </label>
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value)
              setValidationError("")
            }}
            placeholder={'[\n  {"id": "题目id", "answer": "A", "explanation": "..."}\n]'}
            style={{ minHeight: 120 }}
          />
        </div>
        {validationError && (
          <p style={{ color: "var(--danger)", fontSize: 13, margin: "6px 0 0" }}>
            {validationError}
          </p>
        )}
        <div className="modal-actions">
          <button onClick={props.onClose}>取消</button>
          <button className="primary-button" onClick={handleApply}>
            <Check size={17} /> 校验并应用
          </button>
        </div>
      </div>
    </div>
  )
}
