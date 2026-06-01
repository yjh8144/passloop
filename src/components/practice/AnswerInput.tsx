import { Check } from "lucide-react"
import type { PracticeMode, Question } from "../../lib/types"
import { toArray } from "../../lib/question"
import { useT } from "../../contexts"
import { debugLog } from "../../lib/debug"

export function AnswerInput(props: {
  question: Question
  value?: string | string[]
  onChange: (id: string, value: string | string[]) => void
  practiceMode: PracticeMode
  disabled?: boolean
  autoSubmit?: boolean
  onAutoSubmit?: (value: string) => void
}) {
  const t = useT()
  const { question } = props
  const isMemorize = props.practiceMode === "memorize"

  if (isMemorize) {
    return <MemorizeDisplay question={question} />
  }

  const isDisabled = !!props.disabled
  if (question.type === "single" || question.type === "boolean") {
    return (
      <div className="option-stack">
        {question.options.map((option) => (
          <label key={option.id} className="option-row">
            <input
              type="radio"
              name={question.id}
              checked={props.value === option.label}
              onChange={() => {
                if (isDisabled) return
                debugLog("[AnswerInput] single/boolean select", question.id, option.label)
                props.onChange(question.id, option.label)
                if (props.autoSubmit) props.onAutoSubmit?.(option.label)
              }}
              disabled={isDisabled}
            />
            <span>{option.label}</span>
            <p>{option.text}</p>
          </label>
        ))}
      </div>
    )
  }
  if (question.type === "multiple") {
    const selected = toArray(props.value ?? [])
    return (
      <div className="option-stack">
        {question.options.map((option) => (
          <label key={option.id} className="option-row">
            <input
              type="checkbox"
              checked={selected.includes(option.label)}
              onChange={(event) => {
                if (isDisabled) return
                const next = event.target.checked
                  ? [...selected, option.label]
                  : selected.filter((item) => item !== option.label)
                debugLog(
                  "[AnswerInput] multiple toggle",
                  question.id,
                  option.label,
                  event.target.checked,
                )
                props.onChange(question.id, next)
              }}
              disabled={isDisabled}
            />
            <span>{option.label}</span>
            <p>{option.text}</p>
          </label>
        ))}
      </div>
    )
  }
  if (question.type === "blank") {
    const blanks = Math.max(1, toArray(question.answer).length)
    const values = toArray(props.value ?? Array.from({ length: blanks }, () => ""))
    return (
      <div className="blank-grid">
        {Array.from({ length: blanks }).map((_, index) => (
          <input
            key={index}
            value={values[index] ?? ""}
            placeholder={t("blankPlaceholder", index + 1)}
            disabled={isDisabled}
            onChange={(event) => {
              const next = [...values]
              next[index] = event.target.value
              props.onChange(question.id, next)
            }}
          />
        ))}
      </div>
    )
  }
  if (question.type === "short") {
    const blanks = Math.max(1, toArray(question.answer).length)
    const values = toArray(props.value ?? Array.from({ length: blanks }, () => ""))
    return (
      <div className="blank-grid">
        {Array.from({ length: blanks }).map((_, index) => (
          <textarea
            key={index}
            value={values[index] ?? ""}
            placeholder={blanks > 1 ? t("shortPlaceholder", index + 1) : t("inputAnswer")}
            disabled={isDisabled}
            onChange={(event) => {
              const next = [...values]
              next[index] = event.target.value
              props.onChange(question.id, next)
            }}
          />
        ))}
      </div>
    )
  }
  return null
}

function MemorizeDisplay({ question }: { question: Question }) {
  if (question.type === "single" || question.type === "boolean") {
    const correctAnswer = String(question.answer)
    return (
      <div className="option-stack memorize-display">
        {question.options.map((option) => (
          <div
            key={option.id}
            className={`option-display-row ${option.label === correctAnswer ? "is-correct" : ""}`}
          >
            <span className="option-label">{option.label}</span>
            <p>{option.text}</p>
            {option.label === correctAnswer && <Check size={16} className="correct-icon" />}
          </div>
        ))}
      </div>
    )
  }
  if (question.type === "multiple") {
    const correctAnswers = toArray(question.answer)
    return (
      <div className="option-stack memorize-display">
        {question.options.map((option) => (
          <div
            key={option.id}
            className={`option-display-row ${correctAnswers.includes(option.label) ? "is-correct" : ""}`}
          >
            <span className="option-label">{option.label}</span>
            <p>{option.text}</p>
            {correctAnswers.includes(option.label) && <Check size={16} className="correct-icon" />}
          </div>
        ))}
      </div>
    )
  }
  if (question.type === "blank") {
    const answers = toArray(question.answer)
    return (
      <div className="memorize-answer-display blank-answers">
        {answers.map((ans, index) => (
          <div key={index} className="blank-answer-item">
            <span className="blank-label">#{index + 1}</span>
            <span className="blank-value">{ans}</span>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="memorize-answer-display short-answers">
      {(() => {
        const answers = toArray(question.answer)
        if (answers.length <= 1) {
          return <p className="short-answer-value">{answers[0] ?? ""}</p>
        }
        return answers.map((ans, index) => (
          <div key={index} className="blank-answer-item">
            <span className="blank-label">#{index + 1}</span>
            <span className="blank-value">{ans}</span>
          </div>
        ))
      })()}
    </div>
  )
}
