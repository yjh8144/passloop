import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { useT } from "../../contexts"
import { useEscapeKey } from "../../hooks/useEscapeKey"

export type ConfirmDialogState = {
  message: string
  onConfirm: (dontAskAgain: boolean) => void
  dismissLabel?: string
  tone?: "danger" | "normal"
  onCancel?: () => void
  cancelLabel?: string
  confirmLabel?: string
} | null

export function ConfirmDialog({
  state,
  onClose,
}: {
  state: ConfirmDialogState
  onClose: () => void
}) {
  const t = useT()
  const [dontAskAgain, setDontAskAgain] = useState(false)
  const [prevState, setPrevState] = useState(state)
  if (state !== prevState) {
    setDontAskAgain(false)
    setPrevState(state)
  }
  useEscapeKey(onClose, !!state)
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
        {state.dismissLabel && (
          <label className="modal-dismiss-option">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
            />
            {state.dismissLabel}
          </label>
        )}
        <div className="modal-actions">
          <button
            onClick={() => {
              state.onCancel?.()
              onClose()
            }}
          >
            {state.cancelLabel ?? t("cancel")}
          </button>
          <button
            className={state.tone === "danger" ? "danger-button" : "primary-button"}
            onClick={() => {
              state.onConfirm(dontAskAgain)
              onClose()
            }}
          >
            {state.confirmLabel ?? t("confirmAction")}
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

  useEscapeKey(onClose, !!state)
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
          <button className="accent-button" onClick={handleSubmit} disabled={!value.trim()}>
            {t("confirmAction")}
          </button>
        </div>
      </div>
    </div>
  )
}
