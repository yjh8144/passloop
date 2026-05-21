import { Eraser, Plus } from "lucide-react"
import type { AppData, PracticeMode, SubmitMode, ViewMode, RevealMode } from "../../lib/types"
import { Segmented } from "../ui/Segmented"
import { useT } from "../../contexts"

export function ControlPanel(props: {
  settings: AppData["settings"]
  updateSettings: (patch: Partial<AppData["settings"]>) => void
  onRedoWrong: () => void
  onExportWrong: () => void
  onCreateWrongList: () => void
  onClearListAttempts: () => void
}) {
  const t = useT()
  return (
    <section className="inspector-panel">
      <h3>{t("controls")}</h3>
      <Segmented
        value={props.settings.viewMode}
        options={[
          ["single", t("singleQuestion")],
          ["paper", t("allQuestions")],
        ]}
        onChange={(value) => props.updateSettings({ viewMode: value as ViewMode })}
      />
      <Segmented
        value={props.settings.practiceMode}
        options={[
          ["practice", t("practice")],
          ["memorize", t("memorize")],
        ]}
        onChange={(value) => props.updateSettings({ practiceMode: value as PracticeMode })}
      />
      {props.settings.practiceMode !== "memorize" && (
        <Segmented
          value={props.settings.submitMode}
          options={[
            ["each", t("eachSubmit")],
            ["paper", t("paperSubmit")],
          ]}
          onChange={(value) => props.updateSettings({ submitMode: value as SubmitMode })}
        />
      )}
      {props.settings.practiceMode !== "memorize" && props.settings.submitMode !== "paper" && (
        <Segmented
          value={props.settings.revealMode}
          options={[
            ["immediate", t("revealImmediate")],
            ["end", t("revealEnd")],
          ]}
          onChange={(value) => props.updateSettings({ revealMode: value as RevealMode })}
        />
      )}
      {props.settings.practiceMode !== "memorize" && props.settings.submitMode !== "paper" && (
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={props.settings.autoNext}
            onChange={(event) => props.updateSettings({ autoNext: event.target.checked })}
          />
          {t("autoNext")}
        </label>
      )}
      <label className="field-label">
        {t("sort")}
        <select
          value={props.settings.sortMode}
          onChange={(event) =>
            props.updateSettings({
              sortMode: event.target.value as AppData["settings"]["sortMode"],
            })
          }
        >
          <option value="manual">{t("manual")}</option>
          <option value="random">{t("random")}</option>
          <option value="name">{t("name")}</option>
          <option value="type">{t("type")}</option>
        </select>
      </label>
      <div className="two-col-actions">
        <button onClick={props.onRedoWrong}>{t("redoWrong")}</button>
        <button onClick={props.onExportWrong}>{t("exportWrong")}</button>
      </div>
      <div className="two-col-actions">
        <button onClick={props.onCreateWrongList}>
          <Plus size={16} /> {t("createWrongList")}
        </button>
      </div>
      <div className="two-col-actions">
        <button className="danger-outline" onClick={props.onClearListAttempts}>
          <Eraser size={16} /> {t("clearListAttempts")}
        </button>
      </div>
    </section>
  )
}
