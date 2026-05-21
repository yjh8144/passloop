import type { getListStats } from "../../lib/question"
import type { Settings, TFunc } from "../../lib/types"

export function StatsPanel(props: {
  t: TFunc
  stats: ReturnType<typeof getListStats>
  revealMode: Settings["revealMode"]
}) {
  const hideCorrectness = props.revealMode === "end"
  const items = hideCorrectness
    ? [
        [props.t("avgTime"), `${props.stats.avgTime}s`],
        [props.t("finished"), `${props.stats.submitted}`],
      ]
    : [
        [props.t("correctRate"), `${props.stats.accuracy}%`],
        [props.t("avgTime"), `${props.stats.avgTime}s`],
        [props.t("finished"), `${props.stats.submitted}`],
        [props.t("wrongCount"), `${props.stats.wrong}`],
      ]
  return (
    <section className="inspector-panel">
      <h3>{props.t("stats")}</h3>
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
        {props.t("progress")} {props.stats.attempted}/{props.stats.total}
      </small>
    </section>
  )
}
