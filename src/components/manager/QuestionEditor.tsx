import { useEffect, useState } from "react"
import { Check, Plus, Trash2, X } from "lucide-react"
import type { ChoiceOption, Question, QuestionType } from "../../lib/types"
import { createEmptyQuestion, createId, normalizeQuestion, typeLabels } from "../../lib/question"
import { questionTypes } from "../../utils/constants"

export function QuestionEditor(props: {
  question: Question
  onSave: (question: Question) => void
  onCancel: () => void
  showPrompt: (title: string, defaultValue: string, onSubmit: (value: string) => void) => void
}) {
  const [draft, setDraft] = useState<Question>(props.question)
  useEffect(() => setDraft(props.question), [props.question])
  const patch = (value: Partial<Question>) =>
    setDraft((current) => ({ ...current, ...value, updatedAt: new Date().toISOString() }))
  const updateOption = (id: string, patchValue: Partial<ChoiceOption>) => {
    patch({
      options: draft.options.map((option) =>
        option.id === id ? { ...option, ...patchValue } : option,
      ),
    })
  }
  return (
    <div className="question-editor">
      <div className="editor-title">
        <h2>编辑题目</h2>
        <button className="icon-button" onClick={props.onCancel}>
          <X size={18} />
        </button>
      </div>
      <label className="field-label">
        题型
        <select
          value={draft.type}
          onChange={(event) => patch({ type: event.target.value as QuestionType })}
        >
          {questionTypes.map((type) => (
            <option key={type} value={type}>
              {typeLabels[type]}
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        标题
        <input value={draft.title} onChange={(event) => patch({ title: event.target.value })} />
      </label>
      <label className="field-label">
        题干
        <textarea
          value={draft.prompt}
          onChange={(event) => patch({ prompt: event.target.value })}
        />
      </label>
      {(draft.type === "single" || draft.type === "multiple" || draft.type === "boolean") && (
        <div className="option-editor">
          <div className="section-title">
            <span>选项</span>
            {draft.type !== "boolean" && (
              <button
                className="icon-button"
                onClick={() =>
                  patch({
                    options: [
                      ...draft.options,
                      {
                        id: createId(),
                        label: String.fromCharCode(65 + draft.options.length),
                        text: "",
                      },
                    ],
                  })
                }
              >
                <Plus size={16} />
              </button>
            )}
          </div>
          {draft.options.map((option) => (
            <div className="option-edit-row" key={option.id}>
              <input
                value={option.label}
                onChange={(event) => updateOption(option.id, { label: event.target.value })}
              />
              <input
                value={option.text}
                onChange={(event) => updateOption(option.id, { text: event.target.value })}
              />
              {draft.type !== "boolean" && (
                <button
                  className="icon-button"
                  onClick={() =>
                    patch({ options: draft.options.filter((item) => item.id !== option.id) })
                  }
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <label className="field-label">
        答案（多选/填空用 | 分隔）
        <input
          value={Array.isArray(draft.answer) ? draft.answer.join("|") : draft.answer}
          onChange={(event) =>
            patch({
              answer:
                draft.type === "multiple" || draft.type === "blank"
                  ? event.target.value
                      .split("|")
                      .map((item) => item.trim())
                      .filter(Boolean)
                  : event.target.value,
            })
          }
        />
      </label>
      <label className="field-label">
        解析
        <textarea
          value={draft.explanation}
          onChange={(event) => patch({ explanation: event.target.value })}
        />
      </label>
      {draft.type === "composite" && (
        <div className="sub-editor">
          <div className="section-title">
            <span>子题</span>
            <button
              className="icon-button"
              onClick={() =>
                patch({ subQuestions: [...draft.subQuestions, createEmptyQuestion("single")] })
              }
            >
              <Plus size={16} />
            </button>
          </div>
          {draft.subQuestions.map((subQuestion, index) => (
            <button
              key={subQuestion.id}
              className="sub-row"
              onClick={() => {
                props.showPrompt("子题标题", subQuestion.title, (title) => {
                  patch({
                    subQuestions: draft.subQuestions.map((item) =>
                      item.id === subQuestion.id ? { ...item, title } : item,
                    ),
                  })
                })
              }}
            >
              {index + 1}. {subQuestion.title}
            </button>
          ))}
        </div>
      )}
      <div className="editor-actions">
        <button onClick={props.onCancel}>取消</button>
        <button className="primary-button" onClick={() => props.onSave(normalizeQuestion(draft))}>
          <Check size={17} /> 保存
        </button>
      </div>
    </div>
  )
}
