import { formatDuration } from "../../utils/evaluate";

export type WrongSession = {
  id: string;
  startedAt: number;
  elapsedSeconds: number;
  submitted: number;
  correct: number;
};

export function WrongSessionPanel(props: { session: WrongSession | null }) {
  const submitted = props.session?.submitted ?? 0;
  const correct = props.session?.correct ?? 0;
  const accuracy = submitted ? Math.round((correct / submitted) * 100) : 0;
  const elapsed = props.session?.elapsedSeconds ?? 0;
  const items = [
    ["本次正确率", `${accuracy}%`],
    ["本次用时", formatDuration(elapsed)],
    ["本次提交", `${submitted}`],
    ["本次错题", `${Math.max(0, submitted - correct)}`],
  ];
  return (
    <section className="inspector-panel temp-stats-panel">
      <h3>临时统计</h3>
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
      <small>进入新的错题单会自动重置</small>
    </section>
  );
}
