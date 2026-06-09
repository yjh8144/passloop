import { Download, Shuffle, Undo2, X } from "lucide-react"
import type { Question } from "../../lib/types"
import type { ResultMap } from "../../hooks/types"
import { useT } from "../../contexts"
import { useEscapeKey } from "../../hooks/useEscapeKey"
import { debugLog } from "../../lib/debug"

interface CompletionDialogProps {
  open: boolean
  onClose: () => void
  questions: Question[]
  results: ResultMap
  onClearListAttempts: () => void
  onPracticeWrong: () => void
  onExportWrong: () => void
}

export function CompletionDialog(props: CompletionDialogProps) {
  const t = useT()
  useEscapeKey(props.onClose, props.open)
  if (!props.open) return null

  const correctCount = props.questions.filter((q) => props.results[q.id] === true).length
  const wrongCount = props.questions.filter((q) => props.results[q.id] === false).length

  debugLog("[CompletionDialog] opened", { total: props.questions.length, correctCount, wrongCount })

  return (
    <div className="modal-overlay" onClick={props.onClose}>
      <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("completionDialogTitle")}</h2>
          <button className="icon-button" onClick={props.onClose} aria-label={t("close")} title={t("close")}>
            <X size={18} />
          </button>
        </div>
        <div className="completion-stats">
          <div className="completion-stat-row">
            <span>{t("statTotal")}</span>
            <strong>{props.questions.length}</strong>
          </div>
          <div className="completion-stat-row">
            <span>{t("statCorrect")}</span>
            <strong className="text-correct">{correctCount}</strong>
          </div>
          <div className="completion-stat-row">
            <span>{t("statWrong")}</span>
            <strong className="text-wrong">{wrongCount}</strong>
          </div>
          <div className="completion-stat-row">
            <span>{t("statAccuracy")}</span>
            <strong>
              {props.questions.length
                ? Math.round((correctCount / props.questions.length) * 100)
                : 0}
              %
            </strong>
          </div>
        </div>
        <div className="completion-buttons">
          <button
            className="btn-danger"
            onClick={() => {
              debugLog("[CompletionDialog] action: redoAll")
              props.onClose()
              props.onClearListAttempts()
            }}
          >
            <Undo2 size={16} /> {t("redoAll")}
          </button>
          <button
            onClick={() => {
              debugLog("[CompletionDialog] action: redoWrong")
              props.onClose()
              props.onPracticeWrong()
            }}
          >
            <Shuffle size={16} /> {t("practiceWrongBtn")}
          </button>
          <button
            onClick={() => {
              debugLog("[CompletionDialog] action: exportWrong")
              props.onClose()
              props.onExportWrong()
            }}
          >
            <Download size={16} /> {t("exportWrongBtn")}
          </button>
        </div>
      </div>
    </div>
  )
}
