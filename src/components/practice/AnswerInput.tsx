import type { PracticeMode, Question } from "../../lib/types"
import { toArray } from "../../lib/question"
import { useT } from "../../contexts"

export function AnswerInput(props: {
  question: Question
  value?: string | string[]
  onChange: (id: string, value: string | string[]) => void
  practiceMode: PracticeMode
}) {
  const t = useT()
  const { question } = props
  const isMemorize = props.practiceMode === "memorize"
  if (question.type === "single" || question.type === "boolean") {
    const correctAnswer = String(question.answer)
    return (
      <div className="option-stack">
        {question.options.map((option) => {
          const isCorrect = isMemorize && option.label === correctAnswer
          return (
            <label key={option.id} className={`option-row ${isCorrect ? "memorize-correct" : ""}`}>
              <input
                type="radio"
                name={question.id}
                checked={isMemorize ? option.label === correctAnswer : props.value === option.label}
                onChange={() => {
                  if (isMemorize) return
                  props.onChange(question.id, option.label)
                }}
                disabled={isMemorize}
              />
              <span>{option.label}</span>
              <p>{option.text}</p>
            </label>
          )
        })}
      </div>
    )
  }
  if (question.type === "multiple") {
    const correctAnswers = toArray(question.answer)
    const selected = isMemorize ? correctAnswers : toArray(props.value ?? [])
    return (
      <div className="option-stack">
        {question.options.map((option) => {
          const isCorrect = isMemorize && correctAnswers.includes(option.label)
          return (
            <label key={option.id} className={`option-row ${isCorrect ? "memorize-correct" : ""}`}>
              <input
                type="checkbox"
                checked={selected.includes(option.label)}
                onChange={(event) => {
                  if (isMemorize) return
                  const next = event.target.checked
                    ? [...selected, option.label]
                    : selected.filter((item) => item !== option.label)
                  props.onChange(question.id, next)
                }}
                disabled={isMemorize}
              />
              <span>{option.label}</span>
              <p>{option.text}</p>
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
  return (
    <textarea
      value={String(props.value ?? "")}
      onChange={(event) => props.onChange(question.id, event.target.value)}
      placeholder={t("inputAnswer")}
    />
  )
}
