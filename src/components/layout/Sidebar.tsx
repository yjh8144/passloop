import { useCallback, useRef } from "react"
import {
  BookOpen,
  Bot,
  ChevronDown,
  ChevronUp,
  Edit3,
  Github,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
} from "lucide-react"
import { useT, useNavigation } from "../../contexts"

export function Sidebar(props: { onOpenDebugDialog: () => void }) {
  const t = useT()
  const {
    page,
    changePage,
    mobileSidebarCollapsed,
    setMobileSidebarCollapsed,
    desktopSidebarCollapsed,
    setDesktopSidebarCollapsed,
  } = useNavigation()
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
          aria-label="GitHub"
        >
          <Github size={17} />
        </a>
        <button
          className="icon-button desktop-sidebar-toggle"
          title={desktopSidebarCollapsed ? t("expandSidebar") : t("collapseSidebar")}
          aria-label={desktopSidebarCollapsed ? t("expandSidebar") : t("collapseSidebar")}
          onClick={() => setDesktopSidebarCollapsed((c) => !c)}
        >
          {desktopSidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
        <button
          className="icon-button mobile-sidebar-toggle"
          title={mobileSidebarCollapsed ? t("expandListPanel") : t("collapseListPanel")}
          aria-label={mobileSidebarCollapsed ? t("expandListPanel") : t("collapseListPanel")}
          onClick={() => setMobileSidebarCollapsed((c) => !c)}
        >
          {mobileSidebarCollapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
        </button>
      </div>

      <div className="sidebar-body">
        <nav className="nav-stack" aria-label="navigation">
          <button
            className={page === "practice" ? "active" : ""}
            onClick={() => {
              changePage("practice")
              setMobileSidebarCollapsed(true)
            }}
          >
            <BookOpen size={17} /> {t("dashboard")}
          </button>
          <button
            className={page === "manager" ? "active" : ""}
            onClick={() => {
              changePage("manager")
              setMobileSidebarCollapsed(true)
            }}
          >
            <Edit3 size={17} /> {t("manager")}
          </button>
          <button
            className={page === "llm" ? "active" : ""}
            onClick={() => {
              changePage("llm")
              setMobileSidebarCollapsed(true)
            }}
          >
            <Bot size={17} /> {t("llm")}
          </button>
          <button
            className={page === "settings" ? "active" : ""}
            onClick={() => {
              changePage("settings")
              setMobileSidebarCollapsed(true)
            }}
          >
            <Settings2 size={17} /> {t("settings")}
          </button>
        </nav>
      </div>
    </aside>
  )
}
