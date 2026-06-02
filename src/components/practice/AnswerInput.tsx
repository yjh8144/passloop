import { Check } from "lucide-react"
import type { PracticeMode, Question } from "../../lib/types"
import { toArray, normalizeText } from "../../lib/question"
import { useT } from "../../contexts"
import { debugLog } from "../../lib/debug"

export function AnswerInput(props: {
  question: Question
  value?: string | string[]
  onChange: (id: string, value: string | string[]) => void
  practiceMode: PracticeMode
  disabled?: boolean
  showFeedback?: boolean
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
  const showFeedback = !!props.showFeedback
  if (question.type === "single" || question.type === "boolean") {
    const selected = typeof props.value === "string" ? props.value : ""
    const correct = normalizeText(question.answer)
    return (
      <div className="option-stack">
        {question.options.map((option) => {
          const optionLabel = normalizeText(option.label)
          const isSelected = selected === option.label
          const isCorrect = optionLabel === correct
          return (
            <label
              key={option.id}
              className={`option-row ${getSingleOptionState({
                showFeedback,
                isSelected,
                isCorrect,
              })}`}
            >
              <input
                type="radio"
                name={question.id}
                checked={isSelected}
                onChange={() => {
                  if (isDisabled) return
                  debugLog("[AnswerInput] single/boolean select", question.id, option.label)
                  props.onChange(question.id, option.label)
                  if (props.autoSubmit) props.onAutoSubmit?.(option.label)
                }}
                disabled={isDisabled}
              />
              <span className="option-label">{option.label}</span>
              <p>{option.text}</p>
              {showFeedback && isCorrect && !isSelected && selected !== "" && (
                <Check size={16} className="option-status-icon correct" />
              )}
              {showFeedback && isSelected && !isCorrect && (
                <span className="option-status-icon wrong">×</span>
              )}
            </label>
          )
        })}
      </div>
    )
  }
  if (question.type === "multiple") {
    const selected = toArray(props.value ?? [])
    const selectedSet = new Set(selected.map((item) => normalizeText(item)))
    const correctSet = new Set(toArray(question.answer).map((item) => normalizeText(item)))
    return (
      <div className="option-stack">
        {question.options.map((option) => {
          const optionLabel = normalizeText(option.label)
          const isSelected = selectedSet.has(optionLabel)
          const isCorrect = correctSet.has(optionLabel)
          return (
            <label
              key={option.id}
              className={`option-row ${getMultipleOptionState({
                showFeedback,
                isSelected,
                isCorrect,
              })}`}
            >
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
              <span className="option-label">{option.label}</span>
              <p>{option.text}</p>
              {showFeedback && isSelected && isCorrect && (
                <Check size={16} className="option-status-icon correct" />
              )}
              {showFeedback && isSelected && !isCorrect && (
                <span className="option-status-icon wrong">×</span>
              )}
              {showFeedback && !isSelected && isCorrect && (
                <span className="option-status-icon missed">{t("shouldSelect")}</span>
              )}
            </label>
          )
        })}
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

function getSingleOptionState({
  showFeedback,
  isSelected,
  isCorrect,
}: {
  showFeedback: boolean
  isSelected: boolean
  isCorrect: boolean
}) {
  if (!showFeedback) return isSelected ? "is-selected" : ""
  if (isCorrect) return "is-correct"
  if (isSelected) return "is-wrong"
  return ""
}

function getMultipleOptionState({
  showFeedback,
  isSelected,
  isCorrect,
}: {
  showFeedback: boolean
  isSelected: boolean
  isCorrect: boolean
}) {
  if (!showFeedback) return isSelected ? "is-selected" : ""
  if (isSelected && isCorrect) return "is-correct"
  if (isSelected && !isCorrect) return "is-wrong"
  if (!isSelected && isCorrect) return "is-missed"
  return ""
}

function MemorizeDisplay({ question }: { question: Question }) {
  if (question.type === "single" || question.type === "boolean") {
    const correctAnswer = String(question.answer)
    return (
      <div className="option-stack memorize-display">
        {question.options.map((option) => (
          <div
            key={option.id}
            className={`option-display-row ${
              normalizeText(option.label) === normalizeText(correctAnswer) ? "is-correct" : ""
            }`}
          >
            <span className="option-label">{option.label}</span>
            <p>{option.text}</p>
            {normalizeText(option.label) === normalizeText(correctAnswer) && (
              <Check size={16} className="correct-icon" />
            )}
          </div>
        ))}
      </div>
    )
  }
  if (question.type === "multiple") {
    const correctAnswers = toArray(question.answer)
    const correctSet = new Set(correctAnswers.map((item) => normalizeText(item)))
    return (
      <div className="option-stack memorize-display">
        {question.options.map((option) => (
          <div
            key={option.id}
            className={`option-display-row ${
              correctSet.has(normalizeText(option.label)) ? "is-correct" : ""
            }`}
          >
            <span className="option-label">{option.label}</span>
            <p>{option.text}</p>
            {correctSet.has(normalizeText(option.label)) && (
              <Check size={16} className="correct-icon" />
            )}
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
