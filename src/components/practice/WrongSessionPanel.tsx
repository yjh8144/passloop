import { useT } from "../../contexts"
import { formatDuration } from "../../utils/evaluate"
import type { WrongSession } from "../../hooks/practiceReducer"

export type { WrongSession }

export function WrongSessionPanel(props: { session: WrongSession | null }) {
  const t = useT()
  const submitted = props.session?.submitted ?? 0
  const correct = props.session?.correct ?? 0
  const accuracy = submitted ? Math.round((correct / submitted) * 100) : 0
  const elapsed = props.session?.elapsedSeconds ?? 0
  const items = [
    [t("sessionAccuracy"), `${accuracy}%`],
    [t("sessionTime"), formatDuration(elapsed)],
    [t("sessionSubmitted"), `${submitted}`],
    [t("sessionWrong"), `${Math.max(0, submitted - correct)}`],
  ]
  return (
    <section className="inspector-panel temp-stats-panel">
      <h3>{t("tempStats")}</h3>
      <div className="stats-grid">
        {items.map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="progress-line temp">
        <span style={{ width: `${accuracy}%` }} />
      </div>
      <small>{t("tempStatsHint")}</small>
    </section>
  )
}
