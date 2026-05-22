import { useCallback, useEffect, useState } from "react"
import {
  BookOpen,
  BrainCircuit,
  Download,
  Edit3,
  FileJson,
  Plus,
  Settings2,
  Shuffle,
  Trash2,
  Upload,
} from "lucide-react"
import { useT, useAppData, useNavigation, useLlmConfig } from "../../contexts"

export function BottomNav(props: {
  onQuestionImport: () => void
  onBackupImport: () => void
  onExportList: () => void
  onExportBackup: () => void
  onResetAll: () => void
}) {
  const t = useT()
  const { data, setData, activeList, createList } = useAppData()
  const { page, changePage } = useNavigation()
  const { openLlmConfig } = useLlmConfig()
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
          <div>
            <div className="panel-section-title">
              <span>{t("questionList")}</span>
              <button
                className="icon-button"
                title={t("addList")}
                onClick={() => {
                  createList()
                  close()
                }}
              >
                <Plus size={15} />
              </button>
            </div>
            <div className="panel-list-stack">
              {data.lists.map((list) => (
                <button
                  key={list.id}
                  className={`panel-list-item ${list.id === activeList.id ? "active" : ""}`}
                  onClick={() => {
                    setData((current) => ({ ...current, activeListId: list.id }))
                    close()
                  }}
                >
                  <span>{list.name}</span>
                  <span className="panel-list-item-count">{list.questions.length} {t("questionCount")}</span>
                </button>
              ))}
            </div>
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
                  props.onQuestionImport()
                  close()
                }}
              >
                <Upload size={15} /> {t("importQuestions")}
              </button>
              <button
                className="panel-action-btn"
                onClick={() => {
                  props.onBackupImport()
                  close()
                }}
              >
                <Upload size={15} /> {t("importBackup")}
              </button>
              <button
                className="panel-action-btn"
                onClick={() => {
                  props.onExportList()
                  close()
                }}
              >
                <Download size={15} /> {t("exportList")}
              </button>
              <button
                className="panel-action-btn"
                onClick={() => {
                  props.onExportBackup()
                  close()
                }}
              >
                <FileJson size={15} /> {t("exportBackup")}
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
            <Plus size={22} />
          </div>
        </button>

        <button
          className={`bottom-nav-btn ${page === "llm" ? "active" : ""}`}
          onClick={() => navigate("llm")}
        >
          <BrainCircuit size={20} />
          <span>LLM</span>
        </button>
        <button
          className={`bottom-nav-btn ${page === "wrong" ? "active" : ""}`}
          onClick={() => navigate("wrong")}
        >
          <Shuffle size={20} />
          <span>{t("wrong")}</span>
        </button>
      </nav>
    </div>
  )
}
