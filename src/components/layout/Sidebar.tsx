import { useCallback, useRef, useState } from "react"
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
  X,
} from "lucide-react"
import type { AppData, QuestionList, TFunc } from "../../lib/types"
import { isDebugEnabled, setDebugEnabled, debugLog } from "../../lib/debug"

type Page = "practice" | "manager" | "llm" | "wrong"

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
  collapsed: boolean
  onToggleCollapsed: () => void
  desktopCollapsed: boolean
  onToggleDesktopCollapsed: () => void
}) {
  const { t } = props
  const clickTimesRef = useRef<number[]>([])
  const [showDebugDialog, setShowDebugDialog] = useState(false)
  const [debugEnabled, setDebugState] = useState(() => isDebugEnabled())

  const handleBrandClick = useCallback(() => {
    const now = Date.now()
    clickTimesRef.current.push(now)
    clickTimesRef.current = clickTimesRef.current.filter((ts) => now - ts < 3000)
    if (clickTimesRef.current.length >= 7) {
      clickTimesRef.current = []
      setShowDebugDialog(true)
    }
  }, [])

  const toggleDebug = useCallback(() => {
    const next = !debugEnabled
    setDebugEnabled(next)
    setDebugState(next)
    debugLog(next ? "Debug mode enabled" : "Debug mode disabled")
    setShowDebugDialog(false)
  }, [debugEnabled])

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
          <span>本地轻量化刷题平台</span>
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
          title={props.desktopCollapsed ? "展开侧边栏" : "收起侧边栏"}
          onClick={props.onToggleDesktopCollapsed}
        >
          {props.desktopCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
        <button
          className="icon-button mobile-sidebar-toggle"
          title={props.collapsed ? "展开题单栏" : "收起题单栏"}
          onClick={props.onToggleCollapsed}
        >
          {props.collapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
        </button>
      </div>

      <div className="sidebar-body">
        <nav className="nav-stack" aria-label="主导航">
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
            <span>题单</span>
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
                <small className="list-item-count">{list.questions.length} 题</small>
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-actions">
          <button onClick={props.onOpenLlmConfig}>
            <Settings2 size={16} /> LLM 配置
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
            <Trash2 size={16} /> 清除所有数据
          </button>
        </div>
      </div>

      {showDebugDialog && (
        <div className="modal-overlay" onClick={() => setShowDebugDialog(false)}>
          <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Debug 模式</h2>
              <button className="icon-button" onClick={() => setShowDebugDialog(false)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: "8px 0 16px", lineHeight: 1.6 }}>
              {debugEnabled ? "Debug 模式已开启，控制台将输出日志。" : "Debug 模式已关闭。"}
            </p>
            <div className="modal-actions">
              <button onClick={() => setShowDebugDialog(false)}>取消</button>
              <button
                style={{
                  background: debugEnabled ? "var(--danger)" : "var(--accent)",
                  color: "#fff",
                  borderColor: debugEnabled ? "var(--danger)" : "var(--accent)",
                }}
                onClick={toggleDebug}
              >
                {debugEnabled ? "关闭 Debug" : "开启 Debug"}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
