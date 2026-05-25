import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { useT } from "../../contexts"

export function ResetConfirmDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const t = useT()
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const [prevOpen, setPrevOpen] = useState(open)

  if (open && !prevOpen) {
    setValue("")
  }
  if (open !== prevOpen) setPrevOpen(open)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  if (!open) return null

  const keyword = t("resetKeyword")

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("clearAllDataAction")}</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p style={{ margin: "8px 0 12px", lineHeight: 1.6 }}>{t("resetWarningText")}</p>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim() === keyword) onConfirm()
          }}
          placeholder={t("resetPlaceholderText")}
        />
        <div className="modal-actions">
          <button onClick={onClose}>{t("cancel")}</button>
          <button className="danger-button" disabled={value.trim() !== keyword} onClick={onConfirm}>
            {t("clearAllDataAction")}
          </button>
        </div>
      </div>
    </div>
  )
}
