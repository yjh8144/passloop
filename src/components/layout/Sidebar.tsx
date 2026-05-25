import { useCallback, useRef } from "react"
import {
  BookOpen,
  Bot,
  ChevronDown,
  ChevronUp,
  Edit3,
  FileDown,
  FileUp,
  Github,
  HardDriveDownload,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings2,
  RotateCcw,
  Trash2,
  FolderDown,
  FolderUp,
} from "lucide-react"
import { useT, useAppData, useNavigation, useLlmConfig } from "../../contexts"

export function Sidebar(props: {
  onQuestionImport: () => void
  onBackupImport: () => void
  onExportList: () => void
  onExportBackup: () => void
  onResetAll: () => void
  onOpenDebugDialog: () => void
  onOpenOfflineDialog: () => void
}) {
  const t = useT()
  const { data, setData, activeList, createList } = useAppData()
  const {
    page,
    changePage,
    mobileSidebarCollapsed,
    setMobileSidebarCollapsed,
    desktopSidebarCollapsed,
    setDesktopSidebarCollapsed,
  } = useNavigation()
  const { openLlmConfig } = useLlmConfig()
  const { onOpenDebugDialog } = props
  const clickTimesRef = useRef<number[]>([])

  const handleBrandClick = useCallback(() => {
    const now = Date.now()
    clickTimesRef.current.push(now)
    clickTimesRef.current = clickTimesRef.current.filter((ts) => now - ts < 3000)
    if (clickTimesRef.current.length >= 7) {
      clickTimesRef.current = []
      onOpenDebugDialog()
    }
  }, [onOpenDebugDialog])

  return (
    <aside
      className={`sidebar ${mobileSidebarCollapsed ? "is-collapsed" : ""} ${desktopSidebarCollapsed ? "desktop-collapsed" : ""}`}
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
          title={desktopSidebarCollapsed ? t("expandSidebar") : t("collapseSidebar")}
          onClick={() => setDesktopSidebarCollapsed((c) => !c)}
        >
          {desktopSidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
        <button
          className="icon-button mobile-sidebar-toggle"
          title={mobileSidebarCollapsed ? t("expandListPanel") : t("collapseListPanel")}
          onClick={() => setMobileSidebarCollapsed((c) => !c)}
        >
          {mobileSidebarCollapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
        </button>
      </div>

      <div className="sidebar-body">
        <nav className="nav-stack" aria-label="navigation">
          <button
            className={page === "practice" ? "active" : ""}
            onClick={() => changePage("practice")}
          >
            <BookOpen size={17} /> {t("dashboard")}
          </button>
          <button
            className={page === "manager" ? "active" : ""}
            onClick={() => changePage("manager")}
          >
            <Edit3 size={17} /> {t("manager")}
          </button>
          <button className={page === "llm" ? "active" : ""} onClick={() => changePage("llm")}>
            <Bot size={17} /> {t("llm")}
          </button>
          <button className={page === "wrong" ? "active" : ""} onClick={() => changePage("wrong")}>
            <RotateCcw size={17} /> {t("wrong")}
          </button>
        </nav>

        <div className="sidebar-section">
          <div className="section-title">
            <span>{t("questionList")}</span>
            <button className="icon-button" title={t("addList")} onClick={createList}>
              <Plus size={16} />
            </button>
          </div>
          <div className="list-stack">
            {data.lists.map((list) => (
              <button
                key={list.id}
                className={`list-item ${list.id === activeList.id ? "active" : ""}`}
                onClick={() => setData((current) => ({ ...current, activeListId: list.id }))}
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
          <button onClick={openLlmConfig}>
            <Settings2 size={16} /> {t("llmConfigBtn")}
          </button>
          <button onClick={props.onQuestionImport}>
            <FileUp size={16} /> {t("importQuestions")}
          </button>
          <button onClick={props.onBackupImport}>
            <FolderUp size={16} /> {t("importBackup")}
          </button>
          <button onClick={props.onExportList}>
            <FileDown size={16} /> {t("exportList")}
          </button>
          <button onClick={props.onExportBackup}>
            <FolderDown size={16} /> {t("exportBackup")}
          </button>
          <button onClick={props.onOpenOfflineDialog}>
            <HardDriveDownload size={16} /> {t("offlineVersion")}
          </button>
          <button className="danger-outline" onClick={props.onResetAll}>
            <Trash2 size={16} /> {t("clearAllData")}
          </button>
        </div>
      </div>
    </aside>
  )
}
