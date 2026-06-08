import { BookOpen, Bot, Edit3, Settings2 } from "lucide-react"
import { useT, useNavigation } from "../../contexts"

export function BottomNav() {
  const t = useT()
  const { page, changePage } = useNavigation()

  const navigate = (p: typeof page) => {
    changePage(p)
  }

  return (
    <div className="bottom-nav-wrapper">
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
          className={`bottom-nav-btn ${page === "llm" ? "active" : ""}`}
          onClick={() => navigate("llm")}
        >
          <Bot size={20} />
          <span>LLM</span>
        </button>
        <button
          className={`bottom-nav-btn ${page === "settings" ? "active" : ""}`}
          onClick={() => navigate("settings")}
        >
          <Settings2 size={20} />
          <span>{t("settings")}</span>
        </button>
      </nav>
    </div>
  )
}
