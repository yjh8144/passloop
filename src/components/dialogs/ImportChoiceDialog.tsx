import { useState } from "react"
import { ArrowLeft, X } from "lucide-react"
import type { QuestionList } from "../../lib/types"
import type { ImportCommitMode } from "../../hooks/types"
import { useT } from "../../contexts"
import { useEscapeKey } from "../../hooks/useEscapeKey"

export function ImportChoiceDialog({
  lists,
  existingLists,
  activeListId,
  activeListName,
  onClose,
  onChoose,
}: {
  lists: QuestionList[] | null
  existingLists: QuestionList[]
  activeListId: string
  activeListName: string
  onClose: () => void
  onChoose: (mode: ImportCommitMode) => void
}) {
  const t = useT()
  const [view, setView] = useState<"default" | "pick">("default")

  const handleClose = () => {
    setView("default")
    onClose()
  }
  const handleChoose = (mode: ImportCommitMode) => {
    setView("default")
    onChoose(mode)
  }

  useEscapeKey(handleClose, !!lists)

  if (!lists) return null
  const totalQuestions = lists.reduce((sum, l) => sum + l.questions.length, 0)
  const hasOtherLists = existingLists.length > 1

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
        {view === "pick" ? (
          <>
            <div className="modal-header">
              <button className="icon-button" onClick={() => setView("default")}>
                <ArrowLeft size={18} />
              </button>
              <h2>{t("selectTargetList")}</h2>
              <button
                className="icon-button"
                onClick={handleClose}
                aria-label={t("close")}
                title={t("close")}
              >
                <X size={18} />
              </button>
            </div>
            <div className="import-choice-buttons">
              {existingLists.map((list) => (
                <button key={list.id} onClick={() => handleChoose({ listId: list.id })}>
                  {list.name} ({list.questions.length})
                  {list.id === activeListId ? ` · ${t("currentListTag")}` : ""}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="modal-header">
              <h2>{t("importTitle")}</h2>
              <button
                className="icon-button"
                onClick={handleClose}
                aria-label={t("close")}
                title={t("close")}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: "8px 0 16px", lineHeight: 1.6 }}>
              {t("totalQuestions", totalQuestions)}
            </p>
            <div className="import-choice-buttons">
              <button onClick={() => handleChoose("current")}>
                {t("addToListName", activeListName)}
              </button>
              {hasOtherLists && (
                <button onClick={() => setView("pick")}>{t("mergeToOtherList")}</button>
              )}
              <button onClick={() => handleChoose("new")}>{t("createNewListBtn")}</button>
            </div>
          </>
        )}
        <div className="modal-actions">
          <button onClick={handleClose}>{t("cancel")}</button>
        </div>
      </div>
    </div>
  )
}
