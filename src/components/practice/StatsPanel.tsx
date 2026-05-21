import type { getListStats } from "../../lib/question"
import type { Settings } from "../../lib/types"
import { useT } from "../../contexts"

export function StatsPanel(props: {
  stats: ReturnType<typeof getListStats>
  revealMode: Settings["revealMode"]
}) {
  const t = useT()
  const hideCorrectness = props.revealMode === "end"
  const items = hideCorrectness
    ? [
        [t("avgTime"), `${props.stats.avgTime}s`],
        [t("finished"), `${props.stats.submitted}`],
      ]
    : [
        [t("correctRate"), `${props.stats.accuracy}%`],
        [t("avgTime"), `${props.stats.avgTime}s`],
        [t("finished"), `${props.stats.submitted}`],
        [t("wrongCount"), `${props.stats.wrong}`],
      ]
  return (
    <section className="inspector-panel">
      <h3>{t("stats")}</h3>
      <div className="stats-grid">
        {items.map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="progress-line">
        <span
          style={{
            width: `${props.stats.total ? (props.stats.attempted / props.stats.total) * 100 : 0}%`,
          }}
        />
      </div>
      <small>
        {t("progress")} {props.stats.attempted}/{props.stats.total}
      </small>
    </section>
  )
}
