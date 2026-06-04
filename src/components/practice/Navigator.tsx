import type { Question } from "../../lib/types"
import { debugLog } from "../../lib/debug"
import { NAV_WINDOW_SIZE, getWindowRange } from "../../utils/windowing"
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
  const range = getWindowRange(props.questions.length, props.currentIndex, NAV_WINDOW_SIZE)
  const visibleQuestions = props.questions.slice(range.start, range.end)
  return (
    <section className="inspector-panel navigator-panel">
      <h3>{t("quickNav")}</h3>
      {props.questions.length > NAV_WINDOW_SIZE && (
        <div className="question-nav-summary">
          {range.start + 1}-{range.end} / {props.questions.length}
        </div>
      )}
      <div className="question-nav-grid">
        {visibleQuestions.map((question, offset) => {
          const index = range.start + offset
          return (
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
          )
        })}
      </div>
    </section>
  )
}
