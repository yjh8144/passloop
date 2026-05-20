import { FileJson } from "lucide-react"

export function EmptyState(props: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <FileJson size={34} />
      <strong>{props.title}</strong>
      <p>{props.description}</p>
    </div>
  )
}
