import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { useT } from "../../contexts"

export type ConfirmDialogState = {
  message: string
  onConfirm: () => void
} | null

export function ConfirmDialog({
  state,
  onClose,
}: {
  state: ConfirmDialogState
  onClose: () => void
}) {
  const t = useT()
  if (!state) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("confirmTitle")}</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>{state.message}</p>
        <div className="modal-actions">
          <button onClick={onClose}>{t("cancel")}</button>
          <button
            className="danger-button"
            onClick={() => {
              state.onConfirm()
              onClose()
            }}
          >
            {t("confirmAction")}
          </button>
        </div>
      </div>
    </div>
  )
}

export type PromptDialogState = {
  title: string
  defaultValue: string
  onSubmit: (value: string) => void
} | null

export function PromptDialog({
  state,
  onClose,
}: {
  state: PromptDialogState
  onClose: () => void
}) {
  const t = useT()
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const [prevState, setPrevState] = useState(state)

  if (state && state !== prevState) {
    setValue(state.defaultValue)
  }
  if (state !== prevState) setPrevState(state)

  useEffect(() => {
    if (state) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [state])

  if (!state) return null

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    state.onSubmit(trimmed)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{state.title}</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit()
          }}
          style={{ marginTop: 8 }}
        />
        <div className="modal-actions">
          <button onClick={onClose}>{t("cancel")}</button>
          <button
            className="accent-button"
            onClick={handleSubmit}
          >
            {t("confirmAction")}
          </button>
        </div>
      </div>
    </div>
  )
}
