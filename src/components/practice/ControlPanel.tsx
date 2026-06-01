import { Shuffle, Trash2 } from "lucide-react"
import type { AppData, PracticeMode, SubmitMode, ViewMode } from "../../lib/types"
import { Segmented } from "../ui/Segmented"
import { useT, usePushToast } from "../../contexts"
import { debugLog } from "../../lib/debug"

export function ControlPanel(props: {
  settings: AppData["settings"]
  updateSettings: (patch: Partial<AppData["settings"]>) => void
  onClearListAttempts?: () => void
  hasAttempts?: boolean
}) {
  const t = useT()
  const pushToast = usePushToast()
  return (
    <section className="inspector-panel">
      <h3>{t("controls")}</h3>
      <Segmented
        value={props.settings.viewMode}
        options={[
          ["single", t("singleQuestion")],
          ["paper", t("allQuestions")],
        ]}
        onChange={(value) => {
          debugLog("[ControlPanel] viewMode changed", value)
          props.updateSettings({ viewMode: value as ViewMode })
        }}
      />
      <Segmented
        value={props.settings.practiceMode}
        options={[
          ["practice", t("practice")],
          ["memorize", t("memorize")],
        ]}
        onChange={(value) => {
          debugLog("[ControlPanel] practiceMode changed", value)
          props.updateSettings({ practiceMode: value as PracticeMode })
          pushToast("info", t("modeProgressKept"))
        }}
      />
      {props.settings.practiceMode !== "memorize" && (
        <Segmented
          value={props.settings.submitMode}
          options={[
            ["each", t("eachSubmit")],
            ["paper", t("paperSubmit")],
          ]}
          onChange={(value) => {
            debugLog("[ControlPanel] submitMode changed", value)
            const patch: Partial<AppData["settings"]> = { submitMode: value as SubmitMode }
            if (value === "each") patch.revealMode = "immediate"
            props.updateSettings(patch)
          }}
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
        <span className="sort-row">
          <select
            value={props.settings.sortMode}
            onChange={(event) => {
              const newSort = event.target.value as AppData["settings"]["sortMode"]
              debugLog("[ControlPanel] sortMode changed", newSort)
              const patch: Partial<AppData["settings"]> = { sortMode: newSort }
              if (newSort === "random") patch.randomSeed = Date.now()
              props.updateSettings(patch)
            }}
          >
            <option value="manual">{t("manual")}</option>
            <option value="random">{t("random")}</option>
            <option value="name">{t("name")}</option>
            <option value="type">{t("type")}</option>
          </select>
          {props.settings.sortMode === "random" && (
            <button
              className="icon-button"
              title={t("reshuffle")}
              onClick={() => props.updateSettings({ randomSeed: Date.now() })}
            >
              <Shuffle size={16} />
            </button>
          )}
        </span>
      </label>
      {props.hasAttempts && props.onClearListAttempts && (
        <button
          className="danger-button"
          onClick={props.onClearListAttempts}
          style={{ width: "100%", marginTop: "10px" }}
        >
          <Trash2 size={16} /> {t("clearListAttempts")}
        </button>
      )}
    </section>
  )
}
