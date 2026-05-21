import { useCallback, useRef } from "react"
import {
  BookOpen,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Download,
  Edit3,
  FileJson,
  Github,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings2,
  Shuffle,
  Trash2,
  Upload,
} from "lucide-react"
import type { AppData, QuestionList, TFunc } from "../../lib/types"
import type { Page } from "../../hooks/types"

export function Sidebar(props: {
  t: TFunc
  page: Page
  setPage: (page: Page) => void
  data: AppData
  activeList: QuestionList
  setData: (data: AppData | ((data: AppData) => AppData)) => void
  createList: () => void
  onQuestionImport: () => void
  onBackupImport: () => void
  onExportList: () => void
  onExportBackup: () => void
  onResetAll: () => void
  onOpenLlmConfig: () => void
  onOpenDebugDialog: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
  desktopCollapsed: boolean
  onToggleDesktopCollapsed: () => void
}) {
  const { t } = props
  const clickTimesRef = useRef<number[]>([])

  const handleBrandClick = useCallback(() => {
    const now = Date.now()
    clickTimesRef.current.push(now)
    clickTimesRef.current = clickTimesRef.current.filter((ts) => now - ts < 3000)
    if (clickTimesRef.current.length >= 7) {
      clickTimesRef.current = []
      props.onOpenDebugDialog()
    }
  }, [props.onOpenDebugDialog])

  return (
    <aside
      className={`sidebar ${props.collapsed ? "is-collapsed" : ""} ${props.desktopCollapsed ? "desktop-collapsed" : ""}`}
    >
      <div className="brand">
        <div className="brand-mark" onClick={handleBrandClick}>
          P
        </div>
        <div className="brand-text">
          <strong>PassLoop</strong>
          <span>{t("brandTagline")}</span>
        </div>
        <a
          href="https://github.com/yjh8144/passloop"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-button github-link"
          title="GitHub"
        >
          <Github size={17} />
        </a>
        <button
          className="icon-button desktop-sidebar-toggle"
          title={props.desktopCollapsed ? t("expandSidebar") : t("collapseSidebar")}
          onClick={props.onToggleDesktopCollapsed}
        >
          {props.desktopCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
        <button
          className="icon-button mobile-sidebar-toggle"
          title={props.collapsed ? t("expandListPanel") : t("collapseListPanel")}
          onClick={props.onToggleCollapsed}
        >
          {props.collapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
        </button>
      </div>

      <div className="sidebar-body">
        <nav className="nav-stack" aria-label="navigation">
          <button
            className={props.page === "practice" ? "active" : ""}
            onClick={() => props.setPage("practice")}
          >
            <BookOpen size={17} /> {t("dashboard")}
          </button>
          <button
            className={props.page === "manager" ? "active" : ""}
            onClick={() => props.setPage("manager")}
          >
            <Edit3 size={17} /> {t("manager")}
          </button>
          <button
            className={props.page === "llm" ? "active" : ""}
            onClick={() => props.setPage("llm")}
          >
            <BrainCircuit size={17} /> {t("llm")}
          </button>
          <button
            className={props.page === "wrong" ? "active" : ""}
            onClick={() => props.setPage("wrong")}
          >
            <Shuffle size={17} /> {t("wrong")}
          </button>
        </nav>

        <div className="sidebar-section">
          <div className="section-title">
            <span>{t("questionList")}</span>
            <button className="icon-button" title={t("addList")} onClick={props.createList}>
              <Plus size={16} />
            </button>
          </div>
          <div className="list-stack">
            {props.data.lists.map((list) => (
              <button
                key={list.id}
                className={`list-item ${list.id === props.activeList.id ? "active" : ""}`}
                onClick={() => props.setData((current) => ({ ...current, activeListId: list.id }))}
              >
                <span className="list-item-name">{list.name}</span>
                <small className="list-item-count">
                  {list.questions.length} {t("questionCount")}
                </small>
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-actions">
          <button onClick={props.onOpenLlmConfig}>
            <Settings2 size={16} /> {t("llmConfigBtn")}
          </button>
          <button onClick={props.onQuestionImport}>
            <Upload size={16} /> {t("importQuestions")}
          </button>
          <button onClick={props.onBackupImport}>
            <Upload size={16} /> {t("importBackup")}
          </button>
          <button onClick={props.onExportList}>
            <Download size={16} /> {t("exportList")}
          </button>
          <button onClick={props.onExportBackup}>
            <FileJson size={16} /> {t("exportBackup")}
          </button>
          <button className="danger-outline" onClick={props.onResetAll}>
            <Trash2 size={16} /> {t("clearAllData")}
          </button>
        </div>
      </div>

    </aside>
  )
}
