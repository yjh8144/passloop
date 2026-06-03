import { Download, X } from "lucide-react"
import { useT } from "../../contexts"
import { useEscapeKey } from "../../hooks/useEscapeKey"

export function OfflineDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  useEscapeKey(onClose, open)
  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("offlineDialogTitle")}</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div style={{ lineHeight: 1.8, fontSize: "0.95rem" }}>
          <h4 style={{ margin: "0 0 4px" }}>{t("offlineBuildTitle")}</h4>
          <p style={{ margin: "0 0 14px", color: "var(--text-muted)" }}>{t("offlineBuildDesc")}</p>

          <h4 style={{ margin: "0 0 4px" }}>{t("offlineStorageTitle")}</h4>
          <p style={{ margin: "0 0 14px", color: "var(--text-muted)" }}>
            {t("offlineStorageDesc")}
          </p>

          <h4 style={{ margin: "0 0 4px" }}>{t("offlineUsageTitle")}</h4>
          <ol style={{ paddingLeft: 20, margin: "0 0 14px", color: "var(--text-muted)" }}>
            <li>{t("offlineUsageStep1")}</li>
            <li>{t("offlineUsageStep2")}</li>
            <li>{t("offlineUsageStep3")}</li>
          </ol>
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>{t("cancel")}</button>
          <button
            className="primary-button"
            onClick={() => window.open("https://github.com/yjh8144/passloop/releases", "_blank")}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Download size={15} /> {t("offlineDownloadBtn")}
          </button>
        </div>
      </div>
    </div>
  )
}
