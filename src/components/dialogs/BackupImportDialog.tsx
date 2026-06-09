import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import type { AppData } from "../../lib/types"
import { useT } from "../../contexts"
import { useEscapeKey } from "../../hooks/useEscapeKey"

export function BackupImportDialog({
  data,
  onClose,
  onChoose,
}: {
  data: AppData | null
  onClose: () => void
  onChoose: (mode: "overwrite" | "merge") => void
}) {
  const t = useT()
  const [step, setStep] = useState<"choose" | "confirm">("choose")
  const [confirmText, setConfirmText] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const [prevData, setPrevData] = useState(data)

  if (data && data !== prevData) {
    setStep("choose")
    setConfirmText("")
  }
  if (data !== prevData) setPrevData(data)

  useEffect(() => {
    if (step === "confirm") setTimeout(() => inputRef.current?.focus(), 0)
  }, [step])

  useEscapeKey(onClose, !!data)

  if (!data) return null

  const keyword = t("confirmOverwriteKeyword")

  if (step === "confirm") {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{t("confirmOverwriteHeader")}</h2>
            <button className="icon-button" onClick={onClose} aria-label={t("close")} title={t("close")}>
              <X size={18} />
            </button>
          </div>
          <p style={{ margin: "8px 0 12px", lineHeight: 1.6, color: "var(--danger)" }}>
            {t("overwriteWarningText")}
          </p>
          <p style={{ margin: "0 0 8px", fontSize: "0.88rem" }}>{t("typeConfirmOverwrite")}</p>
          <input
            ref={inputRef}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={keyword}
            onKeyDown={(e) => {
              if (e.key === "Enter" && confirmText === keyword) {
                onChoose("overwrite")
              }
            }}
          />
          <div className="modal-actions">
            <button onClick={() => setStep("choose")}>{t("back")}</button>
            <button
              className="danger-button"
              disabled={confirmText !== keyword}
              onClick={() => onChoose("overwrite")}
            >
              {t("overwrite")}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("importConfigTitle")}</h2>
          <button className="icon-button" onClick={onClose} aria-label={t("close")} title={t("close")}>
            <X size={18} />
          </button>
        </div>
        <p style={{ margin: "8px 0 16px", lineHeight: 1.6 }}>
          {t("detectedLists", data.lists.length, data.attempts.length)}
        </p>
        <div className="import-choice-buttons">
          <button onClick={() => onChoose("merge")}>{t("mergeToExisting")}</button>
          <button onClick={() => setStep("confirm")}>{t("overwriteCurrentConfig")}</button>
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>{t("cancel")}</button>
        </div>
      </div>
    </div>
  )
}
