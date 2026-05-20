import type { getListStats } from "../../lib/question";

export function StatsPanel(props: { t: (key: string) => string; stats: ReturnType<typeof getListStats> }) {
  const items = [
    [props.t("correctRate"), `${props.stats.accuracy}%`],
    [props.t("avgTime"), `${props.stats.avgTime}s`],
    [props.t("finished"), `${props.stats.submitted}`],
    [props.t("wrongCount"), `${props.stats.wrong}`],
  ];
  return (
    <section className="inspector-panel">
      <h3>统计</h3>
      <div className="stats-grid">
        {items.map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="progress-line">
        <span style={{ width: `${props.stats.total ? (props.stats.attempted / props.stats.total) * 100 : 0}%` }} />
      </div>
      <small>
        进度 {props.stats.attempted}/{props.stats.total}
      </small>
    </section>
  );
}
