import { useEffect, useRef, useState } from "react"
import { BookOpen, Check, Copy, Edit3, FileEdit, Plus, Sparkles, Trash2, X } from "lucide-react"
import type { Question, QuestionList } from "../../lib/types"
import { createEmptyQuestion, getTypeLabels } from "../../lib/question"
import { fillAnswersWithLlm } from "../../lib/llm"
import { debugLog } from "../../lib/debug"
import { EmptyState } from "../ui/EmptyState"
import { QuestionEditor } from "./QuestionEditor"
import { SelfFillDialog } from "./SelfFillDialog"
import {
  useT,
  usePushToast,
  useDialog,
  useLlmConfig,
  useProxy,
  useNavigation,
} from "../../contexts"

export function ManagerPage(props: {
  list: QuestionList
  updateList: (recipe: (list: QuestionList) => QuestionList) => void
  editing: Question | null
  setEditing: (question: Question | null) => void
  onDeleteList: () => void
}) {
  const t = useT()
  const pushToast = usePushToast()
  const { showConfirm } = useDialog()
  const { getConfigForScenario, openLlmConfig } = useLlmConfig()
  const { proxySettings } = useProxy()
  const { managerUnsavedRef } = useNavigation()
  const typeLabelsMap = getTypeLabels(t)
  const [localListName, setLocalListName] = useState(props.list.name)
  const [showFillChoice, setShowFillChoice] = useState(false)
  const [showSelfFill, setShowSelfFill] = useState(false)
  const [selfFillMode, setSelfFillMode] = useState<"answer" | "explanation" | "both">("both")
  const [filling, setFilling] = useState(false)
  const [fillStreamText, setFillStreamText] = useState("")
  const [editorFloatOpen, setEditorFloatOpen] = useState(false)
  const [editorDirty, setEditorDirty] = useState(false)
  const editorRef = useRef<HTMLElement>(null)
  const fillAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      fillAbortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    managerUnsavedRef.current = editorDirty
  }, [editorDirty, managerUnsavedRef])

  const [prevListId, setPrevListId] = useState(props.list.id)
  if (props.list.id !== prevListId) {
    setLocalListName(props.list.name)
    setPrevListId(props.list.id)
  }

  const [prevEditing, setPrevEditing] = useState(props.editing)
  const [prevFilling, setPrevFilling] = useState(filling)
  if ((props.editing && !prevEditing) || (filling && !prevFilling)) {
    setEditorFloatOpen(true)
  }
  if (props.editing !== prevEditing) setPrevEditing(props.editing)
  if (filling !== prevFilling) setPrevFilling(filling)
  if (!props.editing && prevEditing) setEditorDirty(false)

  useEffect(() => {
    if (props.editing && editorRef.current) {
      editorRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [props.editing])

  const handleEditSwitch = (target: Question) => {
    if (props.editing && props.editing.id !== target.id && editorDirty) {
      showConfirm(t("unsavedConfirm"), () => {
        props.setEditing(target)
      })
    } else {
      props.setEditing(target)
    }
  }

  const handleFillAnswers = () => {
    const fillConfig = getConfigForScenario("fill")
    if (!fillConfig || !fillConfig.apiKey.trim()) {
      openLlmConfig()
      return
    }
    setShowFillChoice(true)
  }

  const runFill = async (mode: "answer" | "explanation" | "both") => {
    const rawFillConfig = getConfigForScenario("fill")
    if (!rawFillConfig) {
      openLlmConfig()
      return
    }
    const fillConfig = { ...rawFillConfig, ...proxySettings }
    if (!props.list.questions.length) {
      pushToast("info", t("noQuestionsInList"))
      return
    }
    debugLog("LLM fill started", {
      mode,
      questionCount: props.list.questions.length,
      provider: fillConfig.provider,
      model: fillConfig.model,
    })
    setShowFillChoice(false)
    setFilling(true)
    setFillStreamText("")
    fillAbortRef.current?.abort()
    const controller = new AbortController()
    fillAbortRef.current = controller
    try {
      const updated = await fillAnswersWithLlm(
        props.list.questions,
        fillConfig,
        mode,
        (accumulated) => {
          setFillStreamText(accumulated)
        },
        controller.signal,
        t,
      )
      debugLog("LLM fill completed", { mode, updatedCount: updated.length })
      props.updateList((list) => ({
        ...list,
        questions: updated,
        updatedAt: new Date().toISOString(),
      }))
      if (props.editing) {
        const refreshed = updated.find((q) => q.id === props.editing!.id)
        if (refreshed) props.setEditing(refreshed)
      }
      const label =
        mode === "answer"
          ? t("fillLabel")
          : mode === "explanation"
            ? t("fillLabelExplanation")
            : t("fillLabelBoth")
      pushToast("success", t("llmFillDone", label))
    } catch (error) {
      if (controller.signal.aborted || (error as { name?: string })?.name === "AbortError") {
        debugLog("LLM fill cancelled")
      } else {
        debugLog("LLM fill failed", error)
        pushToast("error", error instanceof Error ? error.message : t("llmFillFailed"))
      }
    } finally {
      if (fillAbortRef.current === controller) fillAbortRef.current = null
      setFilling(false)
    }
  }

  const cancelFill = () => {
    fillAbortRef.current?.abort()
  }

  const saveQuestion = (question: Question) => {
    debugLog("Question saved", { id: question.id, title: question.title, type: question.type })
    props.updateList((list) => {
      const exists = list.questions.some((item) => item.id === question.id)
      return {
        ...list,
        questions: exists
          ? list.questions.map((item) => (item.id === question.id ? question : item))
          : [...list.questions, question],
        updatedAt: new Date().toISOString(),
      }
    })
    setEditorDirty(false)
    managerUnsavedRef.current = false
    props.setEditing(null)
    pushToast("success", t("questionSaved"))
  }

  const deleteQuestion = (id: string) => {
    showConfirm(t("confirmDeleteQuestion"), () => {
      debugLog("Question deleted", { id })
      props.updateList((list) => ({
        ...list,
        questions: list.questions.filter((question) => question.id !== id),
        updatedAt: new Date().toISOString(),
      }))
    })
  }

  return (
    <div className="manager-layout">
      <section className="manager-list">
        <div className="stage-header">
          <div>
            <h1>{t("manager")}</h1>
            <p>{t("managerDesc")}</p>
          </div>
          <div className="stage-tools">
            <button onClick={() => setShowSelfFill(true)}>
              <Copy size={17} /> {t("selfFill")}
            </button>
            <button onClick={filling ? cancelFill : handleFillAnswers}>
              <Sparkles size={17} /> {filling ? t("cancel") : t("llmFill")}
            </button>
            <button
              className="primary-button"
              onClick={() => handleEditSwitch(createEmptyQuestion())}
            >
              <Plus size={17} /> {t("addQuestion")}
            </button>
          </div>
        </div>
        <div className="manager-danger-actions">
          <button className="danger-outline" onClick={props.onDeleteList}>
            <Trash2 size={16} /> {t("deleteList")}
          </button>
        </div>
        <div className="list-editor">
          <input
            value={localListName}
            onChange={(event) => setLocalListName(event.target.value)}
            onBlur={() => {
              const trimmed = localListName.trim()
              if (!trimmed) {
                setLocalListName(props.list.name)
                pushToast("info", t("listNameRequired"))
                return
              }
              if (trimmed !== props.list.name) {
                props.updateList((list) => ({
                  ...list,
                  name: trimmed,
                  updatedAt: new Date().toISOString(),
                }))
              }
            }}
          />
          <textarea
            value={props.list.description}
            placeholder={t("listDesc")}
            onChange={(event) =>
              props.updateList((list) => ({
                ...list,
                description: event.target.value,
                updatedAt: new Date().toISOString(),
              }))
            }
          />
        </div>
        <div className="question-table">
          {props.list.questions.map((question, index) => (
            <div className="question-row" key={question.id}>
              <span>{index + 1}</span>
              <strong>{question.title}</strong>
              <small>{typeLabelsMap[question.type]}</small>
              <button className="icon-button" onClick={() => handleEditSwitch(question)}>
                <Edit3 size={16} />
              </button>
              <button className="icon-button" onClick={() => deleteQuestion(question.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <aside className="editor-panel" ref={editorRef}>
        {filling ? (
          <div className="fill-stream-panel">
            <h2>{t("llmFillingStatus")}</h2>
            <pre className="streaming-preview">{fillStreamText || t("waitingAiResponse")}</pre>
          </div>
        ) : props.editing ? (
          <QuestionEditor
            question={props.editing}
            onCancel={() => {
              setEditorDirty(false)
              managerUnsavedRef.current = false
              props.setEditing(null)
            }}
            onSave={saveQuestion}
            onDirtyChange={setEditorDirty}
          />
        ) : (
          <EmptyState title={t("selectToEditTitle")} description={t("selectToEditDesc")} />
        )}
      </aside>

      <button
        className="editor-fab"
        onClick={() => setEditorFloatOpen(true)}
        title={t("editorTitle")}
      >
        <FileEdit size={22} />
      </button>
      <div
        className={`editor-float-backdrop ${editorFloatOpen ? "is-visible" : ""}`}
        onClick={() => {
          if (props.editing && editorDirty) {
            showConfirm(t("unsavedConfirm"), () => {
              setEditorDirty(false)
              managerUnsavedRef.current = false
              props.setEditing(null)
              setEditorFloatOpen(false)
            })
          } else {
            props.setEditing(null)
            setEditorFloatOpen(false)
          }
        }}
      />
      <div className={`editor-float ${editorFloatOpen ? "is-open" : ""}`}>
        <div className="editor-float-inner">
          <div className="editor-float-header">
            <span>{t("editorTitle")}</span>
            <button
              className="icon-button"
              onClick={() => {
                if (props.editing && editorDirty) {
                  showConfirm(t("unsavedConfirm"), () => {
                    setEditorDirty(false)
                    managerUnsavedRef.current = false
                    props.setEditing(null)
                    setEditorFloatOpen(false)
                  })
                } else {
                  props.setEditing(null)
                  setEditorFloatOpen(false)
                }
              }}
            >
              <X size={16} />
            </button>
          </div>
          {filling ? (
            <div className="fill-stream-panel">
              <h2>{t("llmFillingStatus")}</h2>
              <pre className="streaming-preview">{fillStreamText || t("waitingAiResponse")}</pre>
            </div>
          ) : props.editing ? (
            <QuestionEditor
              question={props.editing}
              onCancel={() => {
                setEditorDirty(false)
                managerUnsavedRef.current = false
                props.setEditing(null)
                setEditorFloatOpen(false)
              }}
              onSave={(q) => {
                saveQuestion(q)
                setEditorFloatOpen(false)
              }}
              onDirtyChange={setEditorDirty}
              hideClose
            />
          ) : (
            <EmptyState title={t("selectToEditTitle")} description={t("selectToEditDesc")} />
          )}
        </div>
      </div>

      {showFillChoice && (
        <div className="modal-overlay" onClick={() => setShowFillChoice(false)}>
          <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t("selectFillContentTitle")}</h2>
              <button className="icon-button" onClick={() => setShowFillChoice(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="modal-desc">{t("selectFillContentDesc")}</p>
            <div className="fill-choice-grid">
              <button onClick={() => runFill("answer")}>
                <Check size={17} /> {t("fillAnswerOnly")}
              </button>
              <button onClick={() => runFill("explanation")}>
                <BookOpen size={17} /> {t("fillExplanationOnly")}
              </button>
              <button className="primary-button" onClick={() => runFill("both")}>
                <Sparkles size={17} /> {t("fillBoth")}
              </button>
            </div>
            <div className="fill-choice-divider">
              <span>{t("orDivider")}</span>
            </div>
            <button
              className="self-fill-button"
              onClick={() => {
                setShowFillChoice(false)
                setShowSelfFill(true)
              }}
            >
              <Copy size={17} /> {t("selfFillButton")}
            </button>
          </div>
        </div>
      )}

      {showSelfFill && (
        <SelfFillDialog
          open={showSelfFill}
          questions={props.list.questions}
          mode={selfFillMode}
          setMode={setSelfFillMode}
          onClose={() => setShowSelfFill(false)}
          onApply={(updated) => {
            props.updateList((list) => ({
              ...list,
              questions: updated,
              updatedAt: new Date().toISOString(),
            }))
            if (props.editing) {
              const refreshed = updated.find((q) => q.id === props.editing!.id)
              if (refreshed) props.setEditing(refreshed)
            }
            setShowSelfFill(false)
            pushToast("success", t("selfFillApplied"))
          }}
        />
      )}
    </div>
  )
}
