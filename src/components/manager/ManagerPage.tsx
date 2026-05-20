import { useEffect, useRef, useState } from "react"
import {
  BookOpen,
  BrainCircuit,
  Check,
  Copy,
  Edit3,
  FileEdit,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import type { LlmConfig, Question, QuestionList, TFunc, Toast } from "../../lib/types"
import { createEmptyQuestion, typeLabels } from "../../lib/question"
import { fillAnswersWithLlm } from "../../lib/llm"
import { debugLog } from "../../lib/debug"
import { EmptyState } from "../ui/EmptyState"
import { QuestionEditor } from "./QuestionEditor"
import { SelfFillDialog } from "./SelfFillDialog"

export function ManagerPage(props: {
  t: TFunc
  list: QuestionList
  updateList: (recipe: (list: QuestionList) => QuestionList) => void
  editing: Question | null
  setEditing: (question: Question | null) => void
  pushToast: (tone: Toast["tone"], message: string) => void
  showConfirm: (message: string, onConfirm: () => void) => void
  showPrompt: (title: string, defaultValue: string, onSubmit: (value: string) => void) => void
  onDeleteList: () => void
  llmConfig: LlmConfig
  onOpenLlmConfig: () => void
}) {
  const [localListName, setLocalListName] = useState(props.list.name)
  const [showFillChoice, setShowFillChoice] = useState(false)
  const [showSelfFill, setShowSelfFill] = useState(false)
  const [selfFillMode, setSelfFillMode] = useState<"answer" | "explanation" | "both">("both")
  const [filling, setFilling] = useState(false)
  const [fillStreamText, setFillStreamText] = useState("")
  const [editorFloatOpen, setEditorFloatOpen] = useState(false)
  const editorRef = useRef<HTMLElement>(null)

  useEffect(() => setLocalListName(props.list.name), [props.list.id, props.list.name])

  useEffect(() => {
    if (props.editing && editorRef.current) {
      editorRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
    if (props.editing || filling) {
      setEditorFloatOpen(true)
    }
  }, [props.editing, filling])

  const handleFillAnswers = () => {
    if (!props.llmConfig.apiKey.trim()) {
      props.onOpenLlmConfig()
      return
    }
    setShowFillChoice(true)
  }

  const runFill = async (mode: "answer" | "explanation" | "both") => {
    if (!props.list.questions.length) {
      props.pushToast("info", "当前题单没有题目。")
      return
    }
    debugLog("LLM fill started", {
      mode,
      questionCount: props.list.questions.length,
      provider: props.llmConfig.provider,
      model: props.llmConfig.model,
    })
    setShowFillChoice(false)
    setFilling(true)
    setFillStreamText("")
    try {
      const updated = await fillAnswersWithLlm(
        props.list.questions,
        props.llmConfig,
        mode,
        (accumulated) => {
          setFillStreamText(accumulated)
        },
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
      const label = mode === "answer" ? "答案" : mode === "explanation" ? "解析" : "答案和解析"
      props.pushToast("success", `LLM 已补充${label}。`)
    } catch (error) {
      debugLog("LLM fill failed", error)
      props.pushToast("error", error instanceof Error ? error.message : "LLM 补充失败。")
    } finally {
      setFilling(false)
    }
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
    props.setEditing(null)
    props.pushToast("success", "题目已保存。")
  }

  const deleteQuestion = (id: string) => {
    props.showConfirm("确定删除这道题吗？", () => {
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
            <h1>{props.t("manager")}</h1>
            <p>新增、删除、修改、查询题目，并维护当前题单信息。</p>
          </div>
          <div className="stage-tools">
            <button onClick={() => setShowSelfFill(true)}>
              <Sparkles size={17} /> 自助 AI 补充
            </button>
            <button onClick={handleFillAnswers} disabled={filling}>
              <BrainCircuit size={17} /> {filling ? "补充中…" : "LLM 补充答案/解析"}
            </button>
            <button
              className="primary-button"
              onClick={() => props.setEditing(createEmptyQuestion())}
            >
              <Plus size={17} /> {props.t("addQuestion")}
            </button>
          </div>
        </div>
        <div className="manager-danger-actions">
          <button className="danger-outline" onClick={props.onDeleteList}>
            <Trash2 size={16} /> 删除当前题单
          </button>
        </div>
        <div className="list-editor">
          <input
            value={localListName}
            onChange={(event) => setLocalListName(event.target.value)}
            onBlur={() =>
              props.updateList((list) => ({
                ...list,
                name: localListName.trim() || list.name,
                updatedAt: new Date().toISOString(),
              }))
            }
          />
          <textarea
            value={props.list.description}
            placeholder="题单描述"
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
              <small>{typeLabels[question.type]}</small>
              <p>{question.prompt || "暂无题干"}</p>
              <button className="icon-button" onClick={() => props.setEditing(question)}>
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
            <h2>LLM 补充中…</h2>
            <pre className="streaming-preview">
              {fillStreamText ||
                "等待 AI 响应…\n\n有推理功能的模型需要等待推理完成后，才能在此处显示解析结果。"}
            </pre>
          </div>
        ) : props.editing ? (
          <QuestionEditor
            question={props.editing}
            onCancel={() => props.setEditing(null)}
            onSave={saveQuestion}
            showPrompt={props.showPrompt}
          />
        ) : (
          <EmptyState title="选择题目编辑" description="点击题目行或新增题目开始编辑。" />
        )}
      </aside>

      <button className="editor-fab" onClick={() => setEditorFloatOpen(true)} title="编辑器">
        <FileEdit size={22} />
      </button>
      <div
        className={`editor-float-backdrop ${editorFloatOpen ? "is-visible" : ""}`}
        onClick={() => {
          if (props.editing) {
            props.showConfirm("编辑内容尚未保存，确认退出吗？", () => {
              props.setEditing(null)
              setEditorFloatOpen(false)
            })
          } else {
            setEditorFloatOpen(false)
          }
        }}
      />
      <div className={`editor-float ${editorFloatOpen ? "is-open" : ""}`}>
        <div className="editor-float-inner">
          <div className="editor-float-header">
            <span>编辑器</span>
            <button className="icon-button" onClick={() => setEditorFloatOpen(false)}>
              <X size={16} />
            </button>
          </div>
          {filling ? (
            <div className="fill-stream-panel">
              <h2>LLM 补充中…</h2>
              <pre className="streaming-preview">
                {fillStreamText ||
                  "等待 AI 响应…\n\n有推理功能的模型需要等待推理完成后，才能在此处显示解析结果。"}
              </pre>
            </div>
          ) : props.editing ? (
            <QuestionEditor
              question={props.editing}
              onCancel={() => {
                props.setEditing(null)
                setEditorFloatOpen(false)
              }}
              onSave={(q) => {
                saveQuestion(q)
                setEditorFloatOpen(false)
              }}
              showPrompt={props.showPrompt}
            />
          ) : (
            <EmptyState title="选择题目编辑" description="点击题目行或新增题目开始编辑。" />
          )}
        </div>
      </div>

      {showFillChoice && (
        <div className="modal-overlay" onClick={() => setShowFillChoice(false)}>
          <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>选择补充内容</h2>
              <button className="icon-button" onClick={() => setShowFillChoice(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="modal-desc">选择需要 LLM 补充的部分，将对当前题单所有题目生效。</p>
            <div className="fill-choice-grid">
              <button onClick={() => runFill("answer")}>
                <Check size={17} /> 仅补充答案
              </button>
              <button onClick={() => runFill("explanation")}>
                <BookOpen size={17} /> 仅补充解析
              </button>
              <button className="primary-button" onClick={() => runFill("both")}>
                <Sparkles size={17} /> 同时补充
              </button>
            </div>
            <div className="fill-choice-divider">
              <span>或者</span>
            </div>
            <button
              className="self-fill-button"
              onClick={() => {
                setShowFillChoice(false)
                setShowSelfFill(true)
              }}
            >
              <Copy size={17} /> 自助补充（用你自己的 AI）
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
            props.pushToast("success", "已应用补充结果。")
          }}
          pushToast={props.pushToast}
        />
      )}
    </div>
  )
}
