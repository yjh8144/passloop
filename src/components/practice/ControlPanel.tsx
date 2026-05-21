import { Eraser, Plus } from "lucide-react"
import type { AppData, PracticeMode, SubmitMode, ViewMode, RevealMode, TFunc } from "../../lib/types"
import { Segmented } from "../ui/Segmented"

export function ControlPanel(props: {
  t: TFunc
  settings: AppData["settings"]
  updateSettings: (patch: Partial<AppData["settings"]>) => void
  onRedoWrong: () => void
  onExportWrong: () => void
  onCreateWrongList: () => void
  onClearListAttempts: () => void
}) {
  return (
    <section className="inspector-panel">
      <h3>{props.t("controls")}</h3>
      <Segmented
        value={props.settings.viewMode}
        options={[
          ["single", props.t("singleQuestion")],
          ["paper", props.t("allQuestions")],
        ]}
        onChange={(value) => props.updateSettings({ viewMode: value as ViewMode })}
      />
      <Segmented
        value={props.settings.practiceMode}
        options={[
          ["practice", props.t("practice")],
          ["memorize", props.t("memorize")],
        ]}
        onChange={(value) => props.updateSettings({ practiceMode: value as PracticeMode })}
      />
      {props.settings.practiceMode !== "memorize" && (
        <Segmented
          value={props.settings.submitMode}
          options={[
            ["each", props.t("eachSubmit")],
            ["paper", props.t("paperSubmit")],
          ]}
          onChange={(value) => props.updateSettings({ submitMode: value as SubmitMode })}
        />
      )}
      {props.settings.practiceMode !== "memorize" && props.settings.submitMode !== "paper" && (
        <Segmented
          value={props.settings.revealMode}
          options={[
            ["immediate", props.t("revealImmediate")],
            ["end", props.t("revealEnd")],
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
          {props.t("autoNext")}
        </label>
      )}
      <label className="field-label">
        {props.t("sort")}
        <select
          value={props.settings.sortMode}
          onChange={(event) =>
            props.updateSettings({
              sortMode: event.target.value as AppData["settings"]["sortMode"],
            })
          }
        >
          <option value="manual">{props.t("manual")}</option>
          <option value="random">{props.t("random")}</option>
          <option value="name">{props.t("name")}</option>
          <option value="type">{props.t("type")}</option>
        </select>
      </label>
      <div className="two-col-actions">
        <button onClick={props.onRedoWrong}>{props.t("redoWrong")}</button>
        <button onClick={props.onExportWrong}>{props.t("exportWrong")}</button>
      </div>
      <div className="two-col-actions">
        <button onClick={props.onCreateWrongList}>
          <Plus size={16} /> {props.t("createWrongList")}
        </button>
      </div>
      <div className="two-col-actions">
        <button className="danger-outline" onClick={props.onClearListAttempts}>
          <Eraser size={16} /> {props.t("clearListAttempts")}
        </button>
      </div>
    </section>
  )
}
