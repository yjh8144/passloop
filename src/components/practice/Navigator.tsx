import type { Question } from "../../lib/types"
import { debugLog } from "../../lib/debug"
import type { ResultMap } from "../../hooks/types"
import { useT } from "../../contexts"

export function Navigator(props: {
  questions: Question[]
  currentIndex: number
  results: ResultMap
  setCurrentIndex: (value: number) => void
  viewMode: "single" | "paper"
  revealMode?: "immediate" | "end"
  allSubmitted?: boolean
  onPaperJump?: (index: number) => void
}) {
  const t = useT()
  const handleClick = (index: number) => {
    debugLog("Navigate to question", {
      index,
      questionId: props.questions[index]?.id,
      viaPaperJump: props.viewMode === "paper" && !!props.onPaperJump,
    })
    if (props.viewMode === "paper" && props.onPaperJump) {
      props.onPaperJump(index)
      return
    }
    props.setCurrentIndex(index)
  }
  const showResult = props.revealMode !== "end" || !!props.allSubmitted
  return (
    <section className="inspector-panel navigator-panel">
      <h3>{t("quickNav")}</h3>
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
