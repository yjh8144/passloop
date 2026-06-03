import { useState } from "react"
import { Github, ChevronLeft, ChevronRight, X } from "lucide-react"
import { useT } from "../../contexts"
import { useEscapeKey } from "../../hooks/useEscapeKey"

export function OnboardingDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const [step, setStep] = useState(0)

  useEscapeKey(onClose, open)

  if (!open) return null

  const steps = [
    {
      title: t("obTitleWelcome"),
      content: [t("obWelcome1"), t("obWelcome2"), t("obWelcome3")],
    },
    {
      title: t("obTitleList"),
      content: [t("obList1"), t("obList2"), t("obList3"), t("obList4")],
    },
    {
      title: t("obTitleImport"),
      content: [t("obImport1"), t("obImport2"), t("obImport3"), t("obImport4")],
    },
    {
      title: t("obTitleManager"),
      content: [t("obManager1"), t("obManager2"), t("obManager3"), t("obManager4")],
    },
    {
      title: t("obTitleLlm"),
      content: [t("obLlm1"), t("obLlm2"), t("obLlm3"), t("obLlm4"), t("obLlm5")],
    },
    {
      title: t("obTitlePractice"),
      content: [
        t("obPractice1"),
        t("obPractice2"),
        t("obPractice3"),
        t("obPractice4"),
        t("obPractice5"),
      ],
    },
    {
      title: t("obTitleWrong"),
      content: [t("obWrong1"), t("obWrong2"), t("obWrong3")],
    },
    {
      title: t("obTitleSettings"),
      content: [t("obSettings1"), t("obSettings2"), t("obSettings3"), t("obSettings4")],
    },
    {
      title: t("obTitleData"),
      content: [t("obData1"), t("obData2"), t("obData3"), t("obData4")],
    },
  ]

  const current = steps[step]
  const isLast = step === steps.length - 1

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{current.title}</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div style={{ lineHeight: 1.8, fontSize: "0.95rem", minHeight: 180 }}>
          <ul style={{ paddingLeft: 20, margin: 0, listStyle: "disc" }}>
            {current.content.map((text, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {step + 1} / {steps.length}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && (
              <button
                className="secondary-button"
                onClick={() => setStep(step - 1)}
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <ChevronLeft size={14} /> {t("obPrev")}
              </button>
            )}
            {isLast ? (
              <button className="primary-button" onClick={onClose}>
                {t("startUsingBtn")}
              </button>
            ) : (
              <button
                className="primary-button"
                onClick={() => setStep(step + 1)}
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                {t("obNext")} <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
        {isLast && (
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
        )}
      </div>
    </div>
  )
}
