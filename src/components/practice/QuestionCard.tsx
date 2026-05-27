import { Check, ChevronRight } from "lucide-react"
import type { PracticeMode, Question } from "../../lib/types"
import { formatAnswer, getTypeLabels } from "../../lib/question"
import { AnswerInput } from "./AnswerInput"
import type { AnswerMap } from "../../hooks/types"
import { useT } from "../../contexts"

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
}) {
  const t = useT()
  const labels = getTypeLabels(t)
  const showAnswer =
    props.practiceMode === "memorize" ||
    (props.submitted && (props.revealMode !== "end" || !!props.allSubmitted))
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
      />

      {!props.compact && !props.hideSubmit && props.practiceMode !== "memorize" && (
        <div className="question-actions">
          <button className="primary-button" onClick={props.onSubmit}>
            <Check size={17} /> {t("submit")}
          </button>
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
