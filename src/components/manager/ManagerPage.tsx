import { useEffect, useRef, useState } from "react"
import { BookOpen, Check, Copy, Edit3, FileEdit, Plus, Sparkles, Trash2, X } from "lucide-react"
import type { Question, QuestionList } from "../../lib/types"
import { createEmptyQuestion, getTypeLabels } from "../../lib/question"
import { fillAnswersWithLlm } from "../../lib/llm"
import { debugLog } from "../../lib/debug"
import { DEFAULT_PAGE_SIZE, getPageSlice } from "../../utils/windowing"
import { EmptyState } from "../ui/EmptyState"
import { useEscapeKey } from "../../hooks/useEscapeKey"
import { QuestionEditor } from "./QuestionEditor"
import { SelfFillDialog } from "./SelfFillDialog"
import { useT, usePushToast, useLlmConfig, useProxy, useNavigation } from "../../contexts"
import { useDialog } from "../../contexts/DialogContext"
import "../../styles/manager/manager.css"

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
  const [isCompactEditor, setIsCompactEditor] = useState(false)
  const [editorDirty, setEditorDirty] = useState(false)
  const [questionPage, setQuestionPage] = useState(1)
  const editorRef = useRef<HTMLElement>(null)
  const fillAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      fillAbortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1180px)")
    const sync = () => {
      setIsCompactEditor(query.matches)
      if (!query.matches) setEditorFloatOpen(false)
    }
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    managerUnsavedRef.current = editorDirty
  }, [editorDirty, managerUnsavedRef])

  useEscapeKey(() => setShowFillChoice(false), showFillChoice)

  const [prevListId, setPrevListId] = useState(props.list.id)
  if (props.list.id !== prevListId) {
    setLocalListName(props.list.name)
    setQuestionPage(1)
    setPrevListId(props.list.id)
  }

  const [prevEditing, setPrevEditing] = useState(props.editing)
  const [prevFilling, setPrevFilling] = useState(filling)
  if (isCompactEditor && ((props.editing && !prevEditing) || (filling && !prevFilling))) {
    setEditorFloatOpen(true)
  }
  if (props.editing !== prevEditing) setPrevEditing(props.editing)
  if (filling !== prevFilling) setPrevFilling(filling)
  if (!props.editing && prevEditing) setEditorDirty(false)

  const questionPageData = getPageSlice(props.list.questions, questionPage, DEFAULT_PAGE_SIZE)

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

  const isEditingNewQuestion =
    props.editing !== null &&
    !props.list.questions.some((question) => question.id === props.editing?.id)

  const cancelEditing = (closeFloat = false) => {
    setEditorDirty(false)
    managerUnsavedRef.current = false
    props.setEditing(null)
    if (closeFloat) setEditorFloatOpen(false)
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

  const questionActionLabel = (key: "editQuestion" | "deleteQuestion", question: Question, index: number) => {
    const title = question.title.trim()
    const summary = title.length > 40 ? `${title.slice(0, 40)}...` : title || t("noPromptText")
    return `${t(key)} ${index + 1}: ${summary}`
  }

  const deleteQuestion = (id: string) => {
    showConfirm(
      t("confirmDeleteQuestion"),
      () => {
        debugLog("Question deleted", { id })
        props.updateList((list) => ({
          ...list,
          questions: list.questions.filter((question) => question.id !== id),
          updatedAt: new Date().toISOString(),
        }))
      },
      { tone: "danger" },
    )
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
          {questionPageData.items.map((question, index) => (
            <div className="question-row" key={question.id}>
              <span>{questionPageData.start + index + 1}</span>
              <strong>{question.title}</strong>
              <small>{typeLabelsMap[question.type]}</small>
              <button
                className="icon-button"
                onClick={() => handleEditSwitch(question)}
                aria-label={questionActionLabel(
                  "editQuestion",
                  question,
                  questionPageData.start + index,
                )}
              >
                <Edit3 size={16} />
              </button>
              <button
                className="icon-button"
                onClick={() => deleteQuestion(question.id)}
                aria-label={questionActionLabel(
                  "deleteQuestion",
                  question,
                  questionPageData.start + index,
                )}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        {props.list.questions.length > DEFAULT_PAGE_SIZE && (
          <div className="question-table-pagination">
            <span>
              {questionPageData.start + 1}-{questionPageData.end} / {props.list.questions.length}
            </span>
            <div>
              <button
                onClick={() => setQuestionPage((page) => Math.max(page - 1, 1))}
                disabled={questionPageData.page <= 1}
              >
                {t("previous")}
              </button>
              <button
                onClick={() =>
                  setQuestionPage((page) => Math.min(page + 1, questionPageData.totalPages))
                }
                disabled={questionPageData.page >= questionPageData.totalPages}
              >
                {t("next")}
              </button>
            </div>
          </div>
        )}
      </section>

      <aside className="editor-panel" ref={editorRef}>
        {!isCompactEditor && filling ? (
          <div className="fill-stream-panel">
            <h2>{t("llmFillingStatus")}</h2>
            <pre className="streaming-preview">{fillStreamText || t("waitingAiResponse")}</pre>
          </div>
        ) : !isCompactEditor && props.editing ? (
          <QuestionEditor
            question={props.editing}
            isNew={isEditingNewQuestion}
            onCancel={() => cancelEditing()}
            onSave={saveQuestion}
            onDirtyChange={setEditorDirty}
          />
        ) : !isCompactEditor ? (
          <EmptyState title={t("selectToEditTitle")} description={t("selectToEditDesc")} />
        ) : null}
      </aside>

      <button
        className="editor-fab"
        onClick={() => setEditorFloatOpen(true)}
        title={t("editorTitle")}
        aria-label={t("editorTitle")}
        aria-hidden={!isCompactEditor || editorFloatOpen}
        tabIndex={!isCompactEditor || editorFloatOpen ? -1 : undefined}
      >
        <FileEdit size={22} />
      </button>
      <div
        className={`editor-float-backdrop ${editorFloatOpen ? "is-visible" : ""}`}
        onClick={() => {
          if (props.editing && editorDirty) {
            showConfirm(t("unsavedConfirm"), () => {
              cancelEditing(true)
            })
          } else {
            cancelEditing(true)
          }
        }}
      />
      <div
        className={`editor-float ${editorFloatOpen ? "is-open" : ""}`}
        aria-hidden={!isCompactEditor || !editorFloatOpen}
      >
        <div className="editor-float-inner">
          <div className="editor-float-header">
            <span>{t("editorTitle")}</span>
            <button
              className="icon-button"
              aria-label={t("close")}
              onClick={() => {
                if (props.editing && editorDirty) {
                  showConfirm(t("unsavedConfirm"), () => {
                    cancelEditing(true)
                  })
                } else {
                  cancelEditing(true)
                }
              }}
            >
              <X size={16} />
            </button>
          </div>
          {isCompactEditor && filling ? (
            <div className="fill-stream-panel">
              <h2>{t("llmFillingStatus")}</h2>
              <pre className="streaming-preview">{fillStreamText || t("waitingAiResponse")}</pre>
            </div>
          ) : isCompactEditor && props.editing ? (
            <QuestionEditor
              question={props.editing}
              isNew={isEditingNewQuestion}
              onCancel={() => cancelEditing(true)}
              onSave={(q) => {
                saveQuestion(q)
                setEditorFloatOpen(false)
              }}
              onDirtyChange={setEditorDirty}
              hideClose
            />
          ) : isCompactEditor ? (
            <EmptyState title={t("selectToEditTitle")} description={t("selectToEditDesc")} />
          ) : null}
        </div>
      </div>

      {showFillChoice && (
        <div className="modal-overlay" onClick={() => setShowFillChoice(false)}>
          <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t("selectFillContentTitle")}</h2>
              <button
                className="icon-button"
                onClick={() => setShowFillChoice(false)}
                aria-label={t("close")}
              >
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
