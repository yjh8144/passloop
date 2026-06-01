import { ArrowUp, ArrowDown } from "lucide-react"
import type { QuestionType } from "../../lib/types"
import { getTypeLabels } from "../../lib/question"
import { useT } from "../../contexts"

export function TypeOrderEditor(props: {
  order: QuestionType[]
  onChange: (next: QuestionType[]) => void
}) {
  const t = useT()
  const labels = getTypeLabels(t)

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= props.order.length) return
    const next = [...props.order]
    ;[next[index], next[target]] = [next[target], next[index]]
    props.onChange(next)
  }

  return (
    <div className="type-order-editor">
      <span className="type-order-label">{t("typeOrderLabel")}</span>
      {props.order.map((type, index) => (
        <div key={type} className="type-order-row">
          <span className="type-order-name">{labels[type]}</span>
          <span className="type-order-actions">
            <button
              className="icon-button"
              title={t("moveUp")}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ArrowUp size={16} />
            </button>
            <button
              className="icon-button"
              title={t("moveDown")}
              disabled={index === props.order.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDown size={16} />
            </button>
          </span>
        </div>
      ))}
    </div>
  )
}
