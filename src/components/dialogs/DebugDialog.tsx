import { useCallback, useState } from "react"
import { X } from "lucide-react"
import { useT } from "../../contexts"
import { debugLog, isDebugEnabled, setDebugEnabled } from "../../lib/debug"

function CrashTrigger({ label }: { label: string }) {
  const [crash, setCrash] = useState(false)
  if (crash) throw new Error("Debug simulated crash")
  return (
    <button className="danger-button" onClick={() => setCrash(true)}>
      {label}
    </button>
  )
}

export function DebugDialog({
  open,
  onClose,
  onShowOnboarding,
  onCreateTestList,
}: {
  open: boolean
  onClose: () => void
  onShowOnboarding?: () => void
  onCreateTestList?: () => void
}) {
  const t = useT()
  const [debugEnabled, setDebugState] = useState(() => isDebugEnabled())

  const toggleDebug = useCallback(() => {
    const next = !debugEnabled
    setDebugEnabled(next)
    setDebugState(next)
    debugLog(next ? "Debug mode enabled" : "Debug mode disabled")
    onClose()
  }, [debugEnabled, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("debugModeTitle")}</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p style={{ margin: "8px 0 16px", lineHeight: 1.6 }}>
          {debugEnabled ? t("debugEnabledText") : t("debugDisabledText")}
        </p>
        <div className="modal-actions">
          {debugEnabled && <CrashTrigger label={t("simulateCrash")} />}
          {debugEnabled && onShowOnboarding && (
            <button
              onClick={() => {
                onShowOnboarding()
                onClose()
              }}
            >
              {t("showOnboarding")}
            </button>
          )}
          {debugEnabled && onCreateTestList && (
            <button
              onClick={() => {
                onCreateTestList()
                onClose()
              }}
            >
              {t("createTestListBtn")}
            </button>
          )}
          <button onClick={onClose}>{t("cancel")}</button>
          <button
            className={debugEnabled ? "danger-button" : "accent-button"}
            onClick={toggleDebug}
          >
            {debugEnabled ? t("disableDebugBtn") : t("enableDebugBtn")}
          </button>
        </div>
      </div>
    </div>
  )
}
