import { useState } from "react"
import { Languages, Moon, Search, Settings2 } from "lucide-react"
import type { AppData, QuestionList, TFunc } from "../../lib/types"
import { ControlPanel } from "../practice/ControlPanel"

type Page = "practice" | "manager" | "llm" | "wrong"

export function Topbar(props: {
  t: TFunc
  page: Page
  query: string
  setQuery: (value: string) => void
  data: AppData
  updateSettings: (patch: Partial<AppData["settings"]>) => void
  activeList: QuestionList
  onRedoWrong: () => void
  onExportWrong: () => void
  onCreateWrongList: () => void
  onClearListAttempts: () => void
}) {
  const { t } = props
  const [showSettings, setShowSettings] = useState(false)
  const showSearch = props.page === "practice" || props.page === "wrong"
  const showSettingsButton = props.page === "practice" || props.page === "wrong"
  return (
    <header className="topbar">
      {showSearch && (
        <div className="search-box">
          <Search size={17} />
          <input
            value={props.query}
            onChange={(event) => props.setQuery(event.target.value)}
            placeholder={t("questionSearch")}
          />
        </div>
      )}
      <div className="topbar-meta">
        <span>{props.activeList.name}</span>
        <span>{props.activeList.questions.length} {t("questionCount")}</span>
      </div>
      <div className="topbar-actions">
        <label className="select-label">
          <Moon size={16} />
          <select
            value={props.data.settings.theme}
            onChange={(event) =>
              props.updateSettings({ theme: event.target.value as AppData["settings"]["theme"] })
            }
          >
            <option value="mint">Mint</option>
            <option value="paper">Paper</option>
            <option value="lavender">Lavender</option>
            <option value="ocean">Ocean</option>
            <option value="rose">Rose</option>
            <option value="night">Night</option>
            <option value="nord">Nord</option>
          </select>
        </label>
        <label className="select-label">
          <Languages size={16} />
          <select
            value={props.data.settings.language}
            onChange={(event) =>
              props.updateSettings({
                language: event.target.value as AppData["settings"]["language"],
              })
            }
          >
            <option value="zh">中文</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
            <option value="fr">Français</option>
          </select>
        </label>
        {showSettingsButton && (
          <div className="topbar-settings-wrap">
            <button
              className="icon-button"
              title={t("practiceSettings")}
              onClick={() => setShowSettings((v) => !v)}
            >
              <Settings2 size={17} />
            </button>
            {showSettings && (
              <div className="topbar-settings-dropdown">
                <ControlPanel
                  t={t}
                  settings={props.data.settings}
                  updateSettings={props.updateSettings}
                  onRedoWrong={props.onRedoWrong}
                  onExportWrong={props.onExportWrong}
                  onCreateWrongList={props.onCreateWrongList}
                  onClearListAttempts={props.onClearListAttempts}
                />
              </div>
            )}
            {showSettings && (
              <div className="topbar-settings-backdrop" onClick={() => setShowSettings(false)} />
            )}
          </div>
        )}
      </div>
    </header>
  )
}
