import type { Question, TFunc } from "../../lib/types"
import { debugLog } from "../../lib/debug"
import type { ResultMap } from "../../hooks/types"

export function Navigator(props: {
  questions: Question[]
  currentIndex: number
  results: ResultMap
  setCurrentIndex: (value: number) => void
  viewMode: "single" | "paper"
  revealMode?: "immediate" | "end"
  allSubmitted?: boolean
  t?: TFunc
}) {
  const handleClick = (index: number) => {
    debugLog("Navigate to question", { index, questionId: props.questions[index]?.id })
    props.setCurrentIndex(index)
    if (props.viewMode === "paper") {
      const el = document.getElementById(`question-${index}`)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }
  const showResult = props.revealMode !== "end" || !!props.allSubmitted
  return (
    <section className="inspector-panel navigator-panel">
      <h3>{props.t ? props.t("quickNav") : "Quick Nav"}</h3>
      <div className="question-nav-grid">
        {props.questions.map((question, index) => (
          <button
            key={question.id}
            className={`${index === props.currentIndex ? "active" : ""} ${
              question.id in props.results
                ? showResult
                  ? props.results[question.id]
                    ? "correct"
                    : "wrong"
                  : "submitted"
                : ""
            }`}
            onClick={() => handleClick(index)}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </section>
  )
}
