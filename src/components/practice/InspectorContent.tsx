import { Download, Shuffle, Trash2, Undo2 } from "lucide-react"
import type { Question } from "../../lib/types"
import type { getListStats } from "../../lib/question"
import type { ResultMap } from "../../hooks/types"
import { StatsPanel } from "./StatsPanel"
import { Navigator } from "./Navigator"
import { useT } from "../../contexts"
import type { AppData } from "../../lib/types"

export interface InspectorContentProps {
  questions: Question[]
  currentIndex: number
  setCurrentIndex: (value: number | ((value: number) => number)) => void
  results: ResultMap
  stats: ReturnType<typeof getListStats>
  settings: AppData["settings"]
  allSubmitted: boolean
  correctCount: number
  wrongCount: number
  navigatorClassName?: string
  onClearListAttempts: () => void
  onPracticeWrong: () => void
  onExportWrong: () => void
  onPaperJump?: (index: number) => void
}

export function InspectorContent(props: InspectorContentProps) {
  const t = useT()
  const navigator = (
    <Navigator
      questions={props.questions}
      currentIndex={props.currentIndex}
      results={props.results}
      setCurrentIndex={props.setCurrentIndex}
      viewMode={props.settings.viewMode}
      revealMode={props.settings.revealMode}
      allSubmitted={props.allSubmitted}
      onPaperJump={props.onPaperJump}
    />
  )
  return (
    <>
      {props.allSubmitted && (
        <section className="inspector-panel completion-actions-panel">
          <h3>{t("allComplete")}</h3>
          <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", margin: "0 0 10px" }}>
            {t("completionSummary", props.questions.length, props.correctCount, props.wrongCount)}
          </p>
          <div className="completion-buttons">
            <button className="btn-danger" onClick={props.onClearListAttempts}>
              <Undo2 size={16} /> {t("redoAll")}
            </button>
            <button onClick={props.onPracticeWrong}>
              <Shuffle size={16} /> {t("practiceWrongBtn")}
            </button>
            <button onClick={props.onExportWrong}>
              <Download size={16} /> {t("exportWrongBtn")}
            </button>
          </div>
        </section>
      )}
      <StatsPanel stats={props.stats} revealMode={props.settings.revealMode} />
      {!props.allSubmitted && props.stats.attempted > 0 && (
        <section className="inspector-panel" style={{ padding: "10px 14px" }}>
          <button
            className="btn-danger"
            onClick={props.onClearListAttempts}
            style={{ width: "100%" }}
          >
            <Trash2 size={16} /> {t("clearAttemptData")}
          </button>
        </section>
      )}
      {props.navigatorClassName ? (
        <div className={props.navigatorClassName}>{navigator}</div>
      ) : (
        navigator
      )}
    </>
  )
}
