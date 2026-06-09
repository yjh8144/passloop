import {
  Bot,
  CloudBackup,
  Download,
  FileDown,
  FileUp,
  FolderDown,
  FolderUp,
  Globe,
  HardDriveDownload,
  Languages,
  Palette,
  Settings2,
  Trash2,
} from "lucide-react"
import type { AppData } from "../../lib/types"
import { useAppData, useLlmConfig, useProxy, useT } from "../../contexts"
import { ControlPanel } from "../practice/ControlPanel"

export function SettingsPage(props: {
  onQuestionImport: () => void
  onBackupImport: () => void
  onRemoteBackup: () => void
  onExportList: () => void
  onExportBackup: () => void
  onResetAll: () => void
  onOpenOfflineDialog: () => void
}) {
  const t = useT()
  const { data, activeList, updateSettings, clearActiveListAttempts } = useAppData()
  const { openLlmConfig } = useLlmConfig()
  const { openProxyConfig } = useProxy()
  const hasAttempts = data.attempts.some((attempt) => attempt.listId === activeList.id)

  return (
    <section className="settings-page">
      <header className="settings-page-header">
        <div>
          <h1>{t("settingsTitle")}</h1>
          <p>{t("settingsDesc")}</p>
        </div>
      </header>

      <div className="settings-page-grid">
        <section className="settings-section">
          <div className="settings-section-heading">
            <Palette size={18} />
            <h2>{t("appearanceSettings")}</h2>
          </div>
          <div className="settings-fields-grid">
            <label className="settings-field">
              <span id="settings-theme-label">{t("theme")}</span>
              <select
                id="settings-theme-select"
                aria-labelledby="settings-theme-label"
                value={data.settings.theme}
                onChange={(event) =>
                  updateSettings({ theme: event.target.value as AppData["settings"]["theme"] })
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
            <label className="settings-field">
              <span id="settings-language-label">
                <Languages size={16} />
                {t("language")}
              </span>
              <select
                id="settings-language-select"
                aria-labelledby="settings-language-label"
                value={data.settings.language}
                onChange={(event) =>
                  updateSettings({
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
          </div>
        </section>

        <section className="settings-section settings-section-wide">
          <div className="settings-section-heading">
            <Settings2 size={18} />
            <h2>{t("practiceSettingsTitle")}</h2>
          </div>
          <ControlPanel
            settings={data.settings}
            updateSettings={updateSettings}
            onClearListAttempts={clearActiveListAttempts}
            hasAttempts={hasAttempts}
          />
        </section>

        <section className="settings-section">
          <div className="settings-section-heading">
            <Bot size={18} />
            <h2>{t("aiNetworkSettings")}</h2>
          </div>
          <div className="settings-action-grid">
            <button onClick={openLlmConfig}>
              <Bot size={16} /> {t("llmConfigBtn")}
            </button>
            <button onClick={openProxyConfig}>
              <Globe size={16} /> {t("proxySettingsBtn")}
            </button>
          </div>
        </section>

        <section className="settings-section settings-section-wide">
          <div className="settings-section-heading">
            <Download size={18} />
            <h2>{t("dataSettings")}</h2>
          </div>
          <div className="settings-action-grid data-actions">
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
            <button onClick={props.onRemoteBackup}>
              <CloudBackup size={16} /> {t("remoteBackup")}
            </button>
            <button onClick={props.onOpenOfflineDialog}>
              <HardDriveDownload size={16} /> {t("offlineVersion")}
            </button>
            <button className="danger-outline" onClick={props.onResetAll}>
              <Trash2 size={16} /> {t("clearAllData")}
            </button>
          </div>
        </section>
      </div>
    </section>
  )
}
