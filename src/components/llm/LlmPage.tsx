import { useEffect, useRef, useState } from "react"
import type { MutableRefObject } from "react"
import {
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  FileText,
  Plus,
  Settings2,
  Sparkles,
  Upload,
  X,
} from "lucide-react"
import type { QuestionList } from "../../lib/types"
import { createId, normalizeImportedList, parseQuestionJson } from "../../lib/question"
import { streamParseLlm, extractJsonText } from "../../lib/llm"
import { downloadJson } from "../../lib/storage"
import { debugLog } from "../../lib/debug"
import { Segmented } from "../ui/Segmented"
import { EmptyState } from "../ui/EmptyState"
import { useEscapeKey } from "../../hooks/useEscapeKey"
import { SelfGenerateDialog } from "./SelfGenerateDialog"
import { ParsedQuestionsEditor } from "./ParsedQuestionsEditor"
import { useT, usePushToast, useLlmConfig, useProxy } from "../../contexts"

export function LlmPage(props: {
  activeList: QuestionList
  updateActiveList: (recipe: (list: QuestionList) => QuestionList) => void
  addImportedList: (list: QuestionList) => void
  unsavedRef: MutableRefObject<boolean>
}) {
  const t = useT()
  const pushToast = usePushToast()
  const { getConfigForScenario, openLlmConfig } = useLlmConfig()
  const { proxySettings } = useProxy()
  const { unsavedRef, updateActiveList, addImportedList } = props
  const rawLlmConfig = getConfigForScenario("parse")
  const config = rawLlmConfig ? { ...rawLlmConfig, ...proxySettings } : null
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
  const [showParseChoice, setShowParseChoice] = useState(false)

  useEscapeKey(() => setShowOverwriteConfirm(false), showOverwriteConfirm)
  useEscapeKey(() => setShowParseChoice(false), showParseChoice)
  const parseAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      parseAbortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    unsavedRef.current = parsedList !== null
  }, [parsedList, unsavedRef])

  const runParser = async () => {
    if (!rawText.trim()) {
      pushToast("error", t("pleaseInputRawText"))
      return
    }
    if (!config) {
      openLlmConfig()
      return
    }
    if ((manualJsonText.trim() || parsedList) && !showOverwriteConfirm) {
      setShowOverwriteConfirm(true)
      return
    }
    setShowOverwriteConfirm(false)
    setShowParseChoice(true)
  }

  const doRunParser = async (mode: "both" | "answer" | "explanation" | "none") => {
    if (!config) {
      openLlmConfig()
      return
    }
    setShowParseChoice(false)
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
    parseAbortRef.current?.abort()
    const controller = new AbortController()
    parseAbortRef.current = controller
    try {
      const fullText = await streamParseLlm(
        rawText,
        config,
        mode,
        (accumulated) => {
          setStreamingText(accumulated)
        },
        controller.signal,
        t,
      )
      const lists = parseQuestionJson(extractJsonText(fullText), t)
      if (!lists.length) {
        throw new Error(t("llmParseFailed"))
      }
      debugLog("LLM parse completed", { questionCount: lists[0]?.questions.length ?? 0 })
      setParsedList(lists[0])
      setParsedJsonText(JSON.stringify(lists[0], null, 2))
      setStreamingText("")
      setSaved(false)
      pushToast("success", t("llmParseComplete"))
    } catch (error) {
      if (controller.signal.aborted || (error as { name?: string })?.name === "AbortError") {
        debugLog("LLM parse cancelled")
      } else {
        debugLog("LLM parse failed", error)
        pushToast("error", error instanceof Error ? error.message : t("llmParseFailed"))
      }
    } finally {
      if (parseAbortRef.current === controller) parseAbortRef.current = null
      setLoading(false)
    }
  }

  const cancelParser = () => {
    parseAbortRef.current?.abort()
  }

  const getEditedList = () => {
    try {
      return normalizeImportedList(JSON.parse(parsedJsonText), t)
    } catch {
      pushToast("error", t("jsonFormatError"))
      return null
    }
  }

  const validateAndSave = () => {
    const list = getEditedList()
    if (!list) return
    if (!list.questions.length) {
      debugLog("Validation failed: no questions")
      pushToast("error", t("validateNoQuestions"))
      return
    }
    for (let i = 0; i < list.questions.length; i++) {
      const q = list.questions[i]
      if (!q.title.trim()) {
        debugLog("Validation failed: missing title", { index: i })
        pushToast("error", t("validateNoTitle", i + 1))
        return
      }
      if ((q.type === "single" || q.type === "multiple") && q.options.length < 2) {
        debugLog("Validation failed: insufficient options", {
          index: i,
          optionCount: q.options.length,
        })
        pushToast("error", t("validateFewOptions", i + 1))
        return
      }
    }
    debugLog("Validation passed", { questionCount: list.questions.length })
    setParsedList(list)
    setParsedJsonText(JSON.stringify(list, null, 2))
    setSaved(true)
    pushToast("success", t("validatePassed"))
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
                  pushToast("error", t("pleaseInputRawTextFirst"))
                  return
                }
                setShowSelfParse(true)
                setManualInput(true)
              }}
            >
              <Copy size={17} /> {t("selfParse")}
            </button>
            <button className="primary-button" onClick={loading ? cancelParser : runParser}>
              <Sparkles size={17} /> {loading ? t("cancel") : t("parse")}
            </button>
          </div>
        </div>
        <button className="llm-config-trigger" onClick={openLlmConfig}>
          <Settings2 size={16} />
          <span>
            {config
              ? `${
                  config.provider === "openai"
                    ? t("openAiCompatible")
                    : config.provider === "anthropic"
                      ? "Anthropic"
                      : "Gemini"
                } / ${config.model || t("modelNotSet")}`
              : t("notAssigned")}
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
                        unsavedRef.current = false
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
                      const incoming = edited.questions.map((q) => ({ ...q, id: createId() }))
                      updateActiveList((currentList) => ({
                        ...currentList,
                        questions: [...currentList.questions, ...incoming],
                        updatedAt: new Date().toISOString(),
                      }))
                      pushToast("success", t("addedToCurrentList", edited.questions.length))
                      unsavedRef.current = false
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
                        addImportedList(list)
                        unsavedRef.current = false
                      }
                    }}
                  >
                    <Plus size={16} /> {t("createNewList")}
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
                  setParsedList(normalizeImportedList(JSON.parse(nextText), t))
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
                  pushToast("error", t("pleaseInputJson"))
                  return
                }
                try {
                  const lists = parseQuestionJson(extractJsonText(manualJsonText), t)
                  debugLog("Manual JSON validated", {
                    questionCount: lists[0]?.questions.length ?? 0,
                    textLength: manualJsonText.length,
                  })
                  setParsedList(lists[0])
                  setParsedJsonText(JSON.stringify(lists[0], null, 2))
                  setSaved(false)
                  setManualInput(false)
                  pushToast("success", t("jsonParseSuccess"))
                } catch (error) {
                  debugLog("Manual JSON validation failed", error)
                  pushToast(
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
            <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>{t("overwriteConfirmContent")}</p>
            <div className="modal-actions">
              <button onClick={() => setShowOverwriteConfirm(false)}>{t("cancel")}</button>
              <button
                className="accent-button"
                onClick={() => {
                  setShowOverwriteConfirm(false)
                  setShowParseChoice(true)
                }}
              >
                {t("confirmOverwriteBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
      {showParseChoice && (
        <div className="modal-overlay" onClick={() => setShowParseChoice(false)}>
          <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t("selectParseContentTitle")}</h2>
              <button className="icon-button" onClick={() => setShowParseChoice(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="modal-desc">{t("selectParseContentDesc")}</p>
            <div className="fill-choice-grid">
              <button className="primary-button" onClick={() => doRunParser("both")}>
                <Sparkles size={17} /> {t("parseAnswerPlusExplanation")}
              </button>
              <button onClick={() => doRunParser("answer")}>
                <Check size={17} /> {t("parseAnswerOnly")}
              </button>
              <button onClick={() => doRunParser("explanation")}>
                <BookOpen size={17} /> {t("parseExplanationOnly")}
              </button>
              <button onClick={() => doRunParser("none")}>
                <FileText size={17} /> {t("parseQuestionsOnly")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
