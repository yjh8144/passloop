import { useEffect, useRef } from "react"
import { Check, ChevronRight } from "lucide-react"
import type { PracticeMode, Question } from "../../lib/types"
import { formatAnswer, getTypeLabels } from "../../lib/question"
import { AnswerInput } from "./AnswerInput"
import type { AnswerMap } from "../../hooks/types"
import { useT } from "../../contexts"

// Window during which a single/boolean selection can still be changed before the
// auto-next auto-submit locks it in (only used when the "pause" preference is on).
const AUTO_SUBMIT_DELAY = 350

export function QuestionCard(props: {
  id?: string
  index: number
  question: Question
  answers: AnswerMap
  setAnswers: (value: AnswerMap | ((value: AnswerMap) => AnswerMap)) => void
  result?: boolean
  submitted: boolean
  practiceMode: PracticeMode
  onSubmit: () => void
  onNext?: () => void
  compact?: boolean
  hideSubmit?: boolean
  revealMode?: "immediate" | "end"
  allSubmitted?: boolean
  autoNext?: boolean
  autoNextPause?: boolean
  onAutoSubmit?: (value: string) => void
}) {
  const t = useT()
  const labels = getTypeLabels(t)
  const autoSubmitTimerRef = useRef<number | null>(null)
  // Cancel a pending auto-submit when the question changes or the card unmounts,
  // so a late timer can't submit the wrong question.
  useEffect(
    () => () => {
      if (autoSubmitTimerRef.current !== null) {
        window.clearTimeout(autoSubmitTimerRef.current)
        autoSubmitTimerRef.current = null
      }
    },
    [props.question.id],
  )
  const handleAutoSubmit = (value: string) => {
    if (!props.onAutoSubmit) return
    if (!props.autoNextPause) {
      props.onAutoSubmit(value)
      return
    }
    if (autoSubmitTimerRef.current !== null) window.clearTimeout(autoSubmitTimerRef.current)
    autoSubmitTimerRef.current = window.setTimeout(() => {
      autoSubmitTimerRef.current = null
      props.onAutoSubmit?.(value)
    }, AUTO_SUBMIT_DELAY)
  }
  const autoSubmitSelect =
    !!props.autoNext &&
    !props.hideSubmit &&
    !props.submitted &&
    props.practiceMode !== "memorize" &&
    (props.question.type === "single" || props.question.type === "boolean")
  const showAnswer =
    props.practiceMode === "memorize" ||
    (props.submitted && (props.revealMode !== "end" || !!props.allSubmitted))
  const showFeedback = showAnswer
  const updateAnswer = (id: string, value: string | string[]) => {
    props.setAnswers((current) => ({ ...current, [id]: value }))
  }
  return (
    <article id={props.id} className={`question-card ${props.compact ? "compact" : ""}`}>
      <div className="question-heading">
        <div>
          <span className="question-type">{labels[props.question.type]}</span>
          <h2>
            {props.index + 1}. {props.question.title}
          </h2>
        </div>
        {props.submitted && (props.revealMode !== "end" || !!props.allSubmitted) && (
          <span className={`result-chip ${props.result ? "correct" : "wrong"}`}>
            {props.result ? t("correct") : t("incorrect")}
          </span>
        )}
      </div>
      {props.question.hint && (
        <div className="hint-box">
          {t("hint")}：{props.question.hint}
        </div>
      )}

      <AnswerInput
        question={props.question}
        value={props.answers[props.question.id]}
        onChange={updateAnswer}
        practiceMode={props.practiceMode}
        disabled={props.submitted}
        showFeedback={showFeedback}
        autoSubmit={autoSubmitSelect}
        onAutoSubmit={handleAutoSubmit}
      />

      {!props.compact && !props.hideSubmit && props.practiceMode !== "memorize" && (
        <div className="question-actions">
          {!props.submitted && !autoSubmitSelect && (
            <button className="primary-button" onClick={props.onSubmit}>
              <Check size={17} /> {t("submit")}
            </button>
          )}
          {props.submitted && props.onNext && (
            <button onClick={props.onNext}>
              {t("next")} <ChevronRight size={17} />
            </button>
          )}
        </div>
      )}

      {!props.compact && props.hideSubmit && props.onNext && (
        <div className="question-actions">
          <button className="primary-button" onClick={props.onNext}>
            {t("next")} <ChevronRight size={17} />
          </button>
        </div>
      )}

      {showAnswer && (
        <div className="answer-panel">
          <div>
            <strong>{t("answer")}</strong>
            <p>{formatAnswer(props.question.answer) || t("notSet")}</p>
          </div>
          <div>
            <strong>{t("explanation")}</strong>
            <p>{props.question.explanation || t("noExplanation")}</p>
          </div>
        </div>
      )}
    </article>
  )
}
