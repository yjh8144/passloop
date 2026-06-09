import { useEffect, useState } from "react"
import { Check, Plus, Trash2, X } from "lucide-react"
import type { ChoiceOption, Question, QuestionType } from "../../lib/types"
import { createId, getTypeLabels, normalizeQuestion, toArray } from "../../lib/question"
import { questionTypes } from "../../utils/constants"
import { usePushToast, useT } from "../../contexts"
import { useDialog } from "../../contexts/DialogContext"

export function QuestionEditor(props: {
  question: Question
  onSave: (question: Question) => void
  onCancel: () => void
  onDirtyChange?: (dirty: boolean) => void
  hideClose?: boolean
  isNew?: boolean
}) {
  const t = useT()
  const pushToast = usePushToast()
  const { showConfirm } = useDialog()
  const labels = getTypeLabels(t)
  const [draft, setDraft] = useState<Question>(props.question)
  const [prevQuestion, setPrevQuestion] = useState(props.question)
  if (props.question !== prevQuestion) {
    setPrevQuestion(props.question)
    setDraft(props.question)
  }
  const { question, onDirtyChange } = props
  useEffect(() => {
    const isDirty =
      draft.type !== question.type ||
      draft.title !== question.title ||
      draft.explanation !== question.explanation ||
      JSON.stringify(draft.answer) !== JSON.stringify(question.answer) ||
      JSON.stringify(draft.options) !== JSON.stringify(question.options)
    onDirtyChange?.(isDirty)
  }, [draft, question, onDirtyChange])
  const patch = (value: Partial<Question>) =>
    setDraft((current) => ({ ...current, ...value, updatedAt: new Date().toISOString() }))
  const updateOption = (id: string, patchValue: Partial<ChoiceOption>) => {
    setDraft((current) => {
      const target = current.options.find((option) => option.id === id)
      const options = current.options.map((option) =>
        option.id === id ? { ...option, ...patchValue } : option,
      )
      // Keep the stored answer in sync when a label is renamed, so it doesn't
      // dangle to a label that no longer exists. Boolean labels are normalized
      // back to T/F on save, so syncing there would corrupt the answer instead.
      let answer = current.answer
      if (
        current.type !== "boolean" &&
        target &&
        patchValue.label !== undefined &&
        patchValue.label !== target.label
      ) {
        const oldLabel = target.label
        const newLabel = patchValue.label
        if (Array.isArray(answer)) {
          answer = answer.map((item) => (item === oldLabel ? newLabel : item))
        } else if (answer === oldLabel) {
          answer = newLabel
        }
      }
      return { ...current, options, answer, updatedAt: new Date().toISOString() }
    })
  }
  const removeOption = (id: string) => {
    setDraft((current) => {
      const target = current.options.find((option) => option.id === id)
      const options = current.options.filter((option) => option.id !== id)
      // Drop the deleted option's label from the answer so it stays valid.
      let answer = current.answer
      if (target) {
        if (Array.isArray(answer)) answer = answer.filter((item) => item !== target.label)
        else if (answer === target.label) answer = ""
      }
      return { ...current, options, answer, updatedAt: new Date().toISOString() }
    })
  }
  const validateDraft = () => {
    if (!draft.title.trim()) return t("questionTitleRequired")
    if (draft.type === "single" || draft.type === "multiple" || draft.type === "boolean") {
      const validOptions = draft.options.filter(
        (option) => option.label.trim() && option.text.trim(),
      )
      if (validOptions.length < 2) return t("questionOptionsRequired")
      const validLabels = new Set(validOptions.map((option) => option.label.trim()))
      if (draft.type === "multiple") {
        const answers = toArray(draft.answer)
          .map((answer) => answer.trim())
          .filter(Boolean)
        if (!answers.length) return t("questionAnswerRequired")
        if (answers.some((answer) => !validLabels.has(answer))) return t("questionAnswerInvalid")
      } else {
        const answer = typeof draft.answer === "string" ? draft.answer.trim() : ""
        if (!answer) return t("questionAnswerRequired")
        if (!validLabels.has(answer)) return t("questionAnswerInvalid")
      }
    } else {
      const answers = toArray(draft.answer)
        .map((answer) => answer.trim())
        .filter(Boolean)
      if (!answers.length) return t("questionAnswerRequired")
    }
    return ""
  }
  const handleSave = () => {
    const error = validateDraft()
    if (error) {
      pushToast("error", error)
      return
    }
    props.onSave(normalizeQuestion(draft, 0, t))
  }
  return (
    <div className="question-editor">
      <div className="editor-title">
        <h2>{props.isNew ? t("addQuestionTitle") : t("editQuestionTitle")}</h2>
        {!props.hideClose && (
          <button className="icon-button" onClick={props.onCancel} aria-label={t("close")}>
            <X size={18} />
          </button>
        )}
      </div>
      <label className="field-label">
        {t("questionTypeLabel")}
        <select
          value={draft.type}
          onChange={(event) => {
            const newType = event.target.value as QuestionType
            if (newType === draft.type) return
            const doSwitch = () => {
              const defaults: Partial<Question> = { type: newType }
              if (newType === "single") {
                defaults.options = ["A", "B", "C", "D"].map((label) => ({
                  id: createId(),
                  label,
                  text: "",
                }))
                defaults.answer = ""
              } else if (newType === "multiple") {
                defaults.options = ["A", "B", "C", "D"].map((label) => ({
                  id: createId(),
                  label,
                  text: "",
                }))
                defaults.answer = []
              } else if (newType === "boolean") {
                defaults.options = [
                  { id: createId(), label: "T", text: "True" },
                  { id: createId(), label: "F", text: "False" },
                ]
                defaults.answer = ""
              } else if (newType === "blank") {
                defaults.options = []
                defaults.answer = []
              } else {
                defaults.options = []
                defaults.answer = []
              }
              patch(defaults)
            }
            const hasContent =
              draft.options.some((o) => o.text.trim()) ||
              (Array.isArray(draft.answer)
                ? draft.answer.some((a) => String(a).trim())
                : !!String(draft.answer).trim())
            if (hasContent) {
              showConfirm(t("confirmTypeSwitch"), doSwitch)
            } else {
              doSwitch()
            }
          }}
        >
          {questionTypes.map((type) => (
            <option key={type} value={type}>
              {labels[type]}
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        {t("titleLabel")}
        <textarea value={draft.title} onChange={(event) => patch({ title: event.target.value })} />
      </label>
      {(draft.type === "single" || draft.type === "multiple" || draft.type === "boolean") && (
        <div className="option-editor">
          <div className="section-title">
            <span>{t("optionsLabel")}</span>
            {draft.type !== "boolean" && (
              <button
                className="icon-button"
                aria-label={t("addOption")}
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
                readOnly={draft.type === "boolean"}
                onChange={(event) => updateOption(option.id, { label: event.target.value })}
              />
              <input
                value={option.text}
                onChange={(event) => updateOption(option.id, { text: event.target.value })}
              />
              {draft.type !== "boolean" && (
                <button
                  className="icon-button"
                  onClick={() => removeOption(option.id)}
                  aria-label={t("deleteOption")}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <label className="field-label">
        {draft.type === "single" || draft.type === "multiple" || draft.type === "boolean"
          ? t("selectAnswerHint")
          : t("answerFieldsLabel")}
        {draft.type === "single" || draft.type === "boolean" ? (
          <div className="answer-toggle-group">
            {draft.options.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-label={t("selectAnswerOption", option.label)}
                className={`answer-toggle-btn ${draft.answer === option.label ? "is-active" : ""}`}
                onClick={() => patch({ answer: option.label })}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : draft.type === "multiple" ? (
          <div className="answer-toggle-group">
            {draft.options.map((option) => {
              const selected = Array.isArray(draft.answer) ? draft.answer : []
              const isActive = selected.includes(option.label)
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-label={t("selectAnswerOption", option.label)}
                  className={`answer-toggle-btn ${isActive ? "is-active" : ""}`}
                  onClick={() =>
                    patch({
                      answer: isActive
                        ? selected.filter((item) => item !== option.label)
                        : [...selected, option.label],
                    })
                  }
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="multi-answer-editor">
            {(() => {
              const answers = Array.isArray(draft.answer)
                ? draft.answer.length > 0
                  ? draft.answer
                  : [""]
                : draft.answer
                  ? [draft.answer]
                  : [""]
              return (
                <>
                  {answers.map((ans, index) => (
                    <div className="multi-answer-row" key={index}>
                      <span className="answer-index">#{index + 1}</span>
                      {draft.type === "short" ? (
                        <textarea
                          value={String(ans)}
                          placeholder={t("shortPlaceholder", index + 1)}
                          onChange={(e) => {
                            const next = [...answers]
                            next[index] = e.target.value
                            patch({ answer: next })
                          }}
                        />
                      ) : (
                        <input
                          value={String(ans)}
                          placeholder={t("blankPlaceholder", index + 1)}
                          onChange={(e) => {
                            const next = [...answers]
                            next[index] = e.target.value
                            patch({ answer: next })
                          }}
                        />
                      )}
                      {answers.length > 1 && (
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={t("deleteOption")}
                          onClick={() => patch({ answer: answers.filter((_, i) => i !== index) })}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="icon-button add-answer-btn"
                    aria-label={t("addOption")}
                    onClick={() => patch({ answer: [...answers, ""] })}
                  >
                    <Plus size={16} />
                  </button>
                </>
              )
            })()}
          </div>
        )}
      </label>
      <label className="field-label">
        {t("explanationLabel")}
        <textarea
          value={draft.explanation}
          onChange={(event) => patch({ explanation: event.target.value })}
        />
      </label>
      <div className="editor-actions">
        <button onClick={props.onCancel}>{t("cancel")}</button>
        <button className="primary-button" onClick={handleSave}>
          <Check size={17} /> {t("save")}
        </button>
      </div>
    </div>
  )
}
