import { X } from "lucide-react"
import type { QuestionList } from "../../lib/types"
import { useT } from "../../contexts"

export function ImportChoiceDialog({
  lists,
  activeListName,
  onClose,
  onChoose,
}: {
  lists: QuestionList[] | null
  activeListName: string
  onClose: () => void
  onChoose: (mode: "current" | "new") => void
}) {
  const t = useT()
  if (!lists) return null
  const totalQuestions = lists.reduce((sum, l) => sum + l.questions.length, 0)
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("importTitle")}</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p style={{ margin: "8px 0 16px", lineHeight: 1.6 }}>
          {t("totalQuestions", totalQuestions)}
        </p>
        <div className="import-choice-buttons">
          <button onClick={() => onChoose("current")}>{t("addToListName", activeListName)}</button>
          <button onClick={() => onChoose("new")}>{t("createNewListBtn")}</button>
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>{t("cancel")}</button>
        </div>
      </div>
    </div>
  )
}
