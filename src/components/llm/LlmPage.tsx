import { useEffect, useState } from "react"
import type { MutableRefObject } from "react"
import {
  Check,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  Plus,
  Settings2,
  Sparkles,
  Upload,
  X,
} from "lucide-react"
import type { LlmConfig, QuestionList, TFunc, Toast } from "../../lib/types"
import { normalizeImportedList, parseQuestionJson } from "../../lib/question"
import { streamParseLlm, extractJsonText } from "../../lib/llm"
import { downloadJson } from "../../lib/storage"
import { debugLog } from "../../lib/debug"
import { Segmented } from "../ui/Segmented"
import { EmptyState } from "../ui/EmptyState"
import { SelfGenerateDialog } from "./SelfGenerateDialog"
import { ParsedQuestionsEditor } from "./ParsedQuestionsEditor"

export function LlmPage(props: {
  t: TFunc
  activeList: QuestionList
  updateActiveList: (recipe: (list: QuestionList) => QuestionList) => void
  addImportedList: (list: QuestionList) => void
  pushToast: (tone: Toast["tone"], message: string) => void
  unsavedRef: MutableRefObject<boolean>
  llmConfig: LlmConfig
  onOpenLlmConfig: () => void
}) {
  const config = props.llmConfig
  const [rawText, setRawText] = useState("")
  const [parsedList, setParsedList] = useState<QuestionList | null>(null)
  const [parsedJsonText, setParsedJsonText] = useState("")
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState("")
  const [outputTab, setOutputTab] = useState<"json" | "preview">("json")
  const [saved, setSaved] = useState(false)
  const [showSelfParse, setShowSelfParse] = useState(false)
  const [selfParseMode, setSelfParseMode] = useState<"answer" | "explanation" | "both" | "none">(
    "both",
  )
  const [manualInput, setManualInput] = useState(false)
  const [manualJsonText, setManualJsonText] = useState("")
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)

  useEffect(() => {
    props.unsavedRef.current = parsedList !== null
  }, [parsedList])

  const runParser = async () => {
    if (!rawText.trim()) {
      props.pushToast("error", "请先粘贴未整理题目文本。")
      return
    }
    if ((manualJsonText.trim() || parsedList) && !showOverwriteConfirm) {
      setShowOverwriteConfirm(true)
      return
    }
    setShowOverwriteConfirm(false)
    doRunParser()
  }

  const doRunParser = async () => {
    debugLog("LLM parse started", {
      provider: config.provider,
      model: config.model,
      textLength: rawText.length,
    })
    setLoading(true)
    setStreamingText("")
    setParsedList(null)
    setParsedJsonText("")
    setManualInput(false)
    setManualJsonText("")
    try {
      const fullText = await streamParseLlm(rawText, config, (accumulated) => {
        setStreamingText(accumulated)
      })
      const lists = parseQuestionJson(extractJsonText(fullText))
      debugLog("LLM parse completed", { questionCount: lists[0]?.questions.length ?? 0 })
      setParsedList(lists[0])
      setParsedJsonText(JSON.stringify(lists[0], null, 2))
      setStreamingText("")
      setSaved(false)
      props.pushToast("success", "LLM 解析完成。")
    } catch (error) {
      debugLog("LLM parse failed", error)
      props.pushToast("error", error instanceof Error ? error.message : "LLM 解析失败。")
    } finally {
      setLoading(false)
    }
  }

  const getEditedList = () => {
    try {
      return normalizeImportedList(JSON.parse(parsedJsonText))
    } catch {
      props.pushToast("error", "解析结果 JSON 仍有格式错误，请修正后再操作。")
      return null
    }
  }

  const validateAndSave = () => {
    const list = getEditedList()
    if (!list) return
    if (!list.questions.length) {
      debugLog("Validation failed: no questions")
      props.pushToast("error", "校验失败：题单中没有题目。")
      return
    }
    for (let i = 0; i < list.questions.length; i++) {
      const q = list.questions[i]
      if (!q.title.trim()) {
        debugLog("Validation failed: missing title", { index: i })
        props.pushToast("error", `校验失败：第 ${i + 1} 题缺少标题。`)
        return
      }
      if ((q.type === "single" || q.type === "multiple") && q.options.length < 2) {
        debugLog("Validation failed: insufficient options", {
          index: i,
          optionCount: q.options.length,
        })
        props.pushToast("error", `校验失败：第 ${i + 1} 题选项不足 2 个。`)
        return
      }
    }
    debugLog("Validation passed", { questionCount: list.questions.length })
    setParsedList(list)
    setParsedJsonText(JSON.stringify(list, null, 2))
    setSaved(true)
    props.pushToast("success", "校验通过，已保存。")
  }

  const enterEdit = () => {
    setSaved(false)
  }

  return (
    <div className="llm-layout">
      <section className="llm-input">
        <div className="stage-header">
          <div>
            <h1>{props.t("llm")}</h1>
            <p>把未整理题目转换为标准题库 JSON，可补答案、解析并直接导入。</p>
          </div>
          <div className="stage-tools">
            <button
              onClick={() => {
                if (!rawText.trim()) {
                  props.pushToast("error", "请先在下方输入框中粘贴题目文本。")
                  return
                }
                setShowSelfParse(true)
                setManualInput(true)
              }}
            >
              <Copy size={17} /> 自助解析
            </button>
            <button className="primary-button" onClick={runParser} disabled={loading}>
              <Sparkles size={17} /> {loading ? "解析中" : props.t("parse")}
            </button>
          </div>
        </div>
        <button className="llm-config-trigger" onClick={props.onOpenLlmConfig}>
          <Settings2 size={16} />
          <span>
            {config.provider === "openai"
              ? "OpenAI 兼容"
              : config.provider === "anthropic"
                ? "Anthropic"
                : "Gemini"}{" "}
            / {config.model || "未设置模型"}
          </span>
          <ChevronRight size={14} />
        </button>
        <label className="upload-raw-text">
          <Upload size={16} /> 上传文本文件
          <input
            type="file"
            accept=".txt,.md,text/plain"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ""
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => {
                const text = String(reader.result ?? "")
                debugLog("Upload raw text file", { fileName: file.name, length: text.length })
                setRawText(text)
              }
              reader.readAsText(file)
            }}
          />
        </label>
        <textarea
          className="raw-question-input"
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder="粘贴未整理格式的题目文本..."
        />
      </section>
      <section className="llm-output">
        <div className="section-title">
          <span>{props.t("parsedQuestions")}</span>
          {parsedList && (
            <div className="inline-actions">
              <Segmented
                value={outputTab}
                options={[
                  ["json", "JSON"],
                  ["preview", "题目预览"],
                ]}
                onChange={(v) => setOutputTab(v as "json" | "preview")}
              />
              {saved ? (
                <>
                  <button onClick={enterEdit}>
                    <Edit3 size={16} /> 修改
                  </button>
                  <button
                    onClick={() => {
                      const list = getEditedList()
                      if (list) {
                        debugLog("Export parsed JSON", {
                          name: list.name,
                          questionCount: list.questions.length,
                        })
                        downloadJson(`${list.name}.json`, list)
                        props.unsavedRef.current = false
                      }
                    }}
                  >
                    <Download size={16} /> {props.t("exportJson")}
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => {
                      const edited = getEditedList()
                      if (!edited) return
                      debugLog("Import to current list", { questionCount: edited.questions.length })
                      props.updateActiveList((currentList) => ({
                        ...currentList,
                        questions: [...currentList.questions, ...edited.questions],
                        updatedAt: new Date().toISOString(),
                      }))
                      props.unsavedRef.current = false
                    }}
                  >
                    <Plus size={16} /> 导入当前题单
                  </button>
                  <button
                    onClick={() => {
                      const list = getEditedList()
                      if (list) {
                        debugLog("Create new list from parsed", {
                          name: list.name,
                          questionCount: list.questions.length,
                        })
                        props.addImportedList(list)
                        props.unsavedRef.current = false
                      }
                    }}
                  >
                    <Copy size={16} /> 新建题单
                  </button>
                </>
              ) : (
                <button className="primary-button" onClick={validateAndSave}>
                  <Check size={16} /> 校验并保存
                </button>
              )}
            </div>
          )}
        </div>
        {parsedList ? (
          outputTab === "json" ? (
            <textarea
              className="json-preview"
              value={parsedJsonText}
              readOnly={saved}
              onChange={(event) => {
                const nextText = event.target.value
                setParsedJsonText(nextText)
                try {
                  setParsedList(normalizeImportedList(JSON.parse(nextText)))
                } catch {
                  setParsedList(parsedList)
                }
              }}
            />
          ) : (
            <ParsedQuestionsEditor
              list={parsedList}
              readOnly={saved}
              onChange={(updated) => {
                setParsedList(updated)
                setParsedJsonText(JSON.stringify(updated, null, 2))
              }}
            />
          )
        ) : loading ? (
          <pre className="streaming-preview">
            {streamingText ||
              "等待 AI 响应…\n\n有推理功能的模型需要等待推理完成后，才能在此处显示解析结果。"}
          </pre>
        ) : manualInput ? (
          <div className="manual-json-input">
            <p className="manual-json-hint">
              将 AI 返回的 JSON 粘贴到下方，或上传 JSON
              文件，然后点击「校验并保存」。你也可以继续使用左侧内置解析。
            </p>
            <div className="json-input-header">
              <span>{manualJsonText.length.toLocaleString()} 字</span>
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
                      debugLog("Upload manual JSON file", {
                        fileName: file.name,
                        length: text.length,
                      })
                      setManualJsonText(text)
                    }
                    reader.readAsText(file)
                  }}
                />
              </label>
            </div>
            <textarea
              className="json-preview"
              value={manualJsonText}
              onChange={(e) => setManualJsonText(e.target.value)}
              placeholder={
                '粘贴 AI 返回的 JSON...\n\n{\n  "name": "题单名称",\n  "questions": [...]\n}'
              }
            />
            <button
              className="primary-button"
              style={{ marginTop: 10 }}
              onClick={() => {
                if (!manualJsonText.trim()) {
                  props.pushToast("error", "请先粘贴 JSON 内容。")
                  return
                }
                try {
                  const lists = parseQuestionJson(extractJsonText(manualJsonText))
                  debugLog("Manual JSON validated", {
                    questionCount: lists[0]?.questions.length ?? 0,
                    textLength: manualJsonText.length,
                  })
                  setParsedList(lists[0])
                  setParsedJsonText(JSON.stringify(lists[0], null, 2))
                  setSaved(false)
                  setManualInput(false)
                  props.pushToast("success", "JSON 解析成功。")
                } catch (error) {
                  debugLog("Manual JSON validation failed", error)
                  props.pushToast(
                    "error",
                    error instanceof Error ? error.message : "JSON 格式错误，请检查内容。",
                  )
                }
              }}
            >
              <Check size={16} /> 校验并保存
            </button>
          </div>
        ) : (
          <EmptyState
            title="等待解析"
            description="使用左侧内置解析，或点击「自助解析」手动粘贴 JSON。"
          />
        )}
      </section>

      {showSelfParse && (
        <SelfGenerateDialog
          open={showSelfParse}
          mode={selfParseMode}
          setMode={setSelfParseMode}
          rawText={rawText}
          onClose={() => setShowSelfParse(false)}
        />
      )}

      {showOverwriteConfirm && (
        <div className="modal-overlay" onClick={() => setShowOverwriteConfirm(false)}>
          <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>覆盖确认</h2>
              <button className="icon-button" onClick={() => setShowOverwriteConfirm(false)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
              右侧已有解析内容，使用内置 LLM 解析会覆盖当前内容。确定继续吗？
            </p>
            <div className="modal-actions">
              <button onClick={() => setShowOverwriteConfirm(false)}>取消</button>
              <button
                style={{ background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }}
                onClick={() => {
                  setShowOverwriteConfirm(false)
                  doRunParser()
                }}
              >
                确定覆盖
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
