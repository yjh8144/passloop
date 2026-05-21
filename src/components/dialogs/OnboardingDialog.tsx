import { Github, X } from "lucide-react"
import { useT } from "../../contexts"

export function OnboardingDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const t = useT()
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("welcomeHeader")}</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div style={{ lineHeight: 1.8, fontSize: "0.95rem" }}>
          <p style={{ marginBottom: 12 }}>{t("welcomeIntro")}</p>
          <ol style={{ paddingLeft: 20, margin: "0 0 12px" }}>
            <li>
              <strong>{t("onboardingStep1Title")}</strong> — {t("onboardingStep1Desc")}
            </li>
            <li>
              <strong>{t("onboardingStep2Title")}</strong> — {t("onboardingStep2Desc")}
            </li>
            <li>
              <strong>{t("onboardingStep3Title")}</strong> — {t("onboardingStep3Desc")}
            </li>
            <li>
              <strong>{t("onboardingStep4Title")}</strong> — {t("onboardingStep4Desc")}
            </li>
            <li>
              <strong>{t("onboardingStep5Title")}</strong> — {t("onboardingStep5Desc")}
            </li>
          </ol>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
            {t("onboardingTipText")}
          </p>
          <p style={{ marginTop: 12, fontSize: "0.9rem" }}>
            <a
              href="https://github.com/yjh8144/passloop"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "var(--accent)",
              }}
            >
              <Github size={16} /> {t("githubRepo")}
            </a>{" "}
            — {t("welcomeStarNote")}
          </p>
        </div>
        <div className="modal-actions">
          <button className="primary-button" style={{ marginLeft: "auto" }} onClick={onClose}>
            {t("startUsingBtn")}
          </button>
        </div>
      </div>
    </div>
  )
}
