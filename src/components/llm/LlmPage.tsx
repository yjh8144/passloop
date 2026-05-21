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
  const { t } = props
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
      props.pushToast("error", t("pleaseInputRawText"))
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
      if (!lists.length) {
        throw new Error(t("llmParseFailed"))
      }
      debugLog("LLM parse completed", { questionCount: lists[0]?.questions.length ?? 0 })
      setParsedList(lists[0])
      setParsedJsonText(JSON.stringify(lists[0], null, 2))
      setStreamingText("")
      setSaved(false)
      props.pushToast("success", t("llmParseComplete"))
    } catch (error) {
      debugLog("LLM parse failed", error)
      props.pushToast("error", error instanceof Error ? error.message : t("llmParseFailed"))
    } finally {
      setLoading(false)
    }
  }

  const getEditedList = () => {
    try {
      return normalizeImportedList(JSON.parse(parsedJsonText))
    } catch {
      props.pushToast("error", t("jsonFormatError"))
      return null
    }
  }

  const validateAndSave = () => {
    const list = getEditedList()
    if (!list) return
    if (!list.questions.length) {
      debugLog("Validation failed: no questions")
      props.pushToast("error", t("validateNoQuestions"))
      return
    }
    for (let i = 0; i < list.questions.length; i++) {
      const q = list.questions[i]
      if (!q.title.trim()) {
        debugLog("Validation failed: missing title", { index: i })
        props.pushToast("error", t("validateNoTitle", i + 1))
        return
      }
      if ((q.type === "single" || q.type === "multiple") && q.options.length < 2) {
        debugLog("Validation failed: insufficient options", {
          index: i,
          optionCount: q.options.length,
        })
        props.pushToast("error", t("validateFewOptions", i + 1))
        return
      }
    }
    debugLog("Validation passed", { questionCount: list.questions.length })
    setParsedList(list)
    setParsedJsonText(JSON.stringify(list, null, 2))
    setSaved(true)
    props.pushToast("success", t("validatePassed"))
  }

  const enterEdit = () => {
    setSaved(false)
  }

  return (
    <div className="llm-layout">
      <section className="llm-input">
        <div className="stage-header">
          <div>
            <h1>{t("llm")}</h1>
            <p>{t("llmDesc")}</p>
          </div>
          <div className="stage-tools">
            <button
              onClick={() => {
                if (!rawText.trim()) {
                  props.pushToast("error", t("pleaseInputRawTextFirst"))
                  return
                }
                setShowSelfParse(true)
                setManualInput(true)
              }}
            >
              <Copy size={17} /> {t("selfParse")}
            </button>
            <button className="primary-button" onClick={runParser} disabled={loading}>
              <Sparkles size={17} /> {loading ? t("parsing") : t("parse")}
            </button>
          </div>
        </div>
        <button className="llm-config-trigger" onClick={props.onOpenLlmConfig}>
          <Settings2 size={16} />
          <span>
            {config.provider === "openai"
              ? t("openAiCompatible")
              : config.provider === "anthropic"
                ? "Anthropic"
                : "Gemini"}{" "}
            / {config.model || t("modelNotSet")}
          </span>
          <ChevronRight size={14} />
        </button>
        <label className="upload-raw-text">
          <Upload size={16} /> {t("uploadTextFile")}
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
          placeholder={t("rawTextPlaceholder")}
        />
      </section>
      <section className="llm-output">
        <div className="section-title">
          <span>{t("parsedQuestions")}</span>
          {parsedList && (
            <div className="inline-actions">
              <Segmented
                value={outputTab}
                options={[
                  ["json", "JSON"],
                  ["preview", t("questionPreviewTab")],
                ]}
                onChange={(v) => setOutputTab(v as "json" | "preview")}
              />
              {saved ? (
                <>
                  <button onClick={enterEdit}>
                    <Edit3 size={16} /> {t("edit")}
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
                    <Download size={16} /> {t("exportJson")}
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
                    <Plus size={16} /> {t("importCurrentList")}
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
                    <Copy size={16} /> {t("createNewList")}
                  </button>
                </>
              ) : (
                <button className="primary-button" onClick={validateAndSave}>
                  <Check size={16} /> {t("validateAndSave")}
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
              t={t}
            />
          )
        ) : loading ? (
          <pre className="streaming-preview">{streamingText || t("waitingAiResponse")}</pre>
        ) : manualInput ? (
          <div className="manual-json-input">
            <p className="manual-json-hint">{t("manualJsonHintText")}</p>
            <div className="json-input-header">
              <span>{t("charCount", manualJsonText.length.toLocaleString())}</span>
              <label className="upload-json-button">
                <Upload size={14} /> {t("uploadJsonBtn")}
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
              placeholder={t("pasteJsonPlaceholder")}
            />
            <button
              className="primary-button"
              style={{ marginTop: 10 }}
              onClick={() => {
                if (!manualJsonText.trim()) {
                  props.pushToast("error", t("pleaseInputJson"))
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
                  props.pushToast("success", t("jsonParseSuccess"))
                } catch (error) {
                  debugLog("Manual JSON validation failed", error)
                  props.pushToast(
                    "error",
                    error instanceof Error ? error.message : t("jsonFormatErrorCheck"),
                  )
                }
              }}
            >
              <Check size={16} /> {t("validateAndSave")}
            </button>
          </div>
        ) : (
          <EmptyState title={t("waitingForParseTitle")} description={t("waitingForParseDesc")} />
        )}
      </section>

      {showSelfParse && (
        <SelfGenerateDialog
          open={showSelfParse}
          mode={selfParseMode}
          setMode={setSelfParseMode}
          rawText={rawText}
          onClose={() => setShowSelfParse(false)}
          t={t}
        />
      )}

      {showOverwriteConfirm && (
        <div className="modal-overlay" onClick={() => setShowOverwriteConfirm(false)}>
          <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t("overwriteConfirmHeader")}</h2>
              <button className="icon-button" onClick={() => setShowOverwriteConfirm(false)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
              {t("overwriteConfirmContent")}
            </p>
            <div className="modal-actions">
              <button onClick={() => setShowOverwriteConfirm(false)}>{t("cancel")}</button>
              <button
                style={{ background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }}
                onClick={() => {
                  setShowOverwriteConfirm(false)
                  doRunParser()
                }}
              >
                {t("confirmOverwriteBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
