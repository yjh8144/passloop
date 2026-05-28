import { useCallback, useEffect, useState } from "react"
import {
  BookOpen,
  Bot,
  Edit3,
  FileDown,
  FileUp,
  FolderDown,
  Github,
  Globe,
  Layers,
  Settings2,
  RotateCcw,
  Trash2,
  FolderUp,
} from "lucide-react"
import { useT, useNavigation, useLlmConfig, useProxy } from "../../contexts"

export function BottomNav(props: {
  onQuestionImport: () => void
  onBackupImport: () => void
  onExportList: () => void
  onExportBackup: () => void
  onResetAll: () => void
}) {
  const t = useT()
  const { page, changePage } = useNavigation()
  const { openLlmConfig } = useLlmConfig()
  const { openProxyConfig } = useProxy()
  const [panelOpen, setPanelOpen] = useState(false)

  const close = useCallback(() => setPanelOpen(false), [])

  useEffect(() => {
    if (!panelOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [panelOpen, close])

  const navigate = (p: typeof page) => {
    changePage(p)
    close()
  }

  return (
    <div className="bottom-nav-wrapper">
      <div className={`bottom-nav-backdrop ${panelOpen ? "is-visible" : ""}`} onClick={close} />

      <div
        className={`bottom-nav-panel ${panelOpen ? "is-open" : ""}`}
        id="bottom-panel"
        role="region"
        aria-label="panel"
      >
        <div className="bottom-nav-panel-content">
          <div className="panel-brand">
            <div className="panel-brand-mark">P</div>
            <div className="panel-brand-text">
              <strong>PassLoop</strong>
              <span>{t("brandTagline")}</span>
            </div>
            <a
              href="https://github.com/yjh8144/passloop"
              target="_blank"
              rel="noopener noreferrer"
              className="icon-button"
              title={t("githubRepo")}
            >
              <Github size={17} />
            </a>
          </div>

          <div>
            <div className="panel-section-title">{t("features")}</div>
            <div className="panel-actions">
              <button
                className="panel-action-btn"
                onClick={() => {
                  openLlmConfig()
                  close()
                }}
              >
                <Settings2 size={15} /> {t("llmConfigBtn")}
              </button>
              <button
                className="panel-action-btn"
                onClick={() => {
                  openProxyConfig()
                  close()
                }}
              >
                <Globe size={15} /> {t("proxySettingsBtn")}
              </button>
              <button
                className="panel-action-btn"
                onClick={() => {
                  props.onQuestionImport()
                  close()
                }}
              >
                <FileUp size={15} /> {t("importQuestions")}
              </button>
              <button
                className="panel-action-btn"
                onClick={() => {
                  props.onBackupImport()
                  close()
                }}
              >
                <FolderUp size={15} /> {t("importBackup")}
              </button>
              <button
                className="panel-action-btn"
                onClick={() => {
                  props.onExportList()
                  close()
                }}
              >
                <FileDown size={15} /> {t("exportList")}
              </button>
              <button
                className="panel-action-btn"
                onClick={() => {
                  props.onExportBackup()
                  close()
                }}
              >
                <FolderDown size={15} /> {t("exportBackup")}
              </button>
              <button
                className="panel-action-btn danger"
                onClick={() => {
                  props.onResetAll()
                  close()
                }}
              >
                <Trash2 size={15} /> {t("clearAllData")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <nav className="bottom-nav" aria-label="navigation">
        <button
          className={`bottom-nav-btn ${page === "practice" ? "active" : ""}`}
          onClick={() => navigate("practice")}
        >
          <BookOpen size={20} />
          <span>{t("dashboard")}</span>
        </button>
        <button
          className={`bottom-nav-btn ${page === "manager" ? "active" : ""}`}
          onClick={() => navigate("manager")}
        >
          <Edit3 size={20} />
          <span>{t("manager")}</span>
        </button>

        <button
          className={`bottom-nav-expand ${panelOpen ? "is-open" : ""}`}
          aria-expanded={panelOpen}
          aria-controls="bottom-panel"
          onClick={() => setPanelOpen(!panelOpen)}
        >
          <div className="bottom-nav-expand-inner">
            <Layers size={20} />
          </div>
        </button>

        <button
          className={`bottom-nav-btn ${page === "llm" ? "active" : ""}`}
          onClick={() => navigate("llm")}
        >
          <Bot size={20} />
          <span>LLM</span>
        </button>
        <button
          className={`bottom-nav-btn ${page === "wrong" ? "active" : ""}`}
          onClick={() => navigate("wrong")}
        >
          <RotateCcw size={20} />
          <span>{t("wrong")}</span>
        </button>
      </nav>
    </div>
  )
}
