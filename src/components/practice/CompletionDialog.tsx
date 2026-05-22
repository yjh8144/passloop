import { Download, Plus, Shuffle, Undo2, X } from "lucide-react"
import type { Question } from "../../lib/types"
import type { ResultMap } from "../../hooks/types"
import { useT } from "../../contexts"

interface CompletionDialogProps {
  open: boolean
  onClose: () => void
  questions: Question[]
  results: ResultMap
  onClearListAttempts: () => void
  onRedoWrong: () => void
  onExportWrong: () => void
  onCreateWrongList: () => void
}

export function CompletionDialog(props: CompletionDialogProps) {
  const t = useT()
  if (!props.open) return null

  const correctCount = props.questions.filter((q) => props.results[q.id] === true).length
  const wrongCount = props.questions.filter((q) => props.results[q.id] === false).length

  return (
    <div className="modal-overlay" onClick={props.onClose}>
      <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("completionDialogTitle")}</h2>
          <button className="icon-button" onClick={props.onClose}>
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
              props.onClose()
              props.onClearListAttempts()
            }}
          >
            <Undo2 size={16} /> {t("redoAll")}
          </button>
          <button
            onClick={() => {
              props.onClose()
              props.onRedoWrong()
            }}
          >
            <Shuffle size={16} /> {t("redoWrongBtn")}
          </button>
          <button
            onClick={() => {
              props.onClose()
              props.onExportWrong()
            }}
          >
            <Download size={16} /> {t("exportWrongBtn")}
          </button>
          <button
            onClick={() => {
              props.onClose()
              props.onCreateWrongList()
            }}
          >
            <Plus size={16} /> {t("createWrongList")}
          </button>
        </div>
      </div>
    </div>
  )
}
