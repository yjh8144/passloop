import { Edit2, Plus, Trash2 } from "lucide-react"
import type { LlmProvider } from "../../lib/types"
import { useT } from "../../contexts"

interface LlmProviderListProps {
  providers: LlmProvider[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onAdd: () => void
}

const providerLabels: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Gemini",
}

export function LlmProviderList({ providers, onEdit, onDelete, onAdd }: LlmProviderListProps) {
  const t = useT()

  return (
    <div className="provider-list">
      {providers.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 14 }}>
          {t("noProviders")}
        </div>
      )}
      {providers.map((p) => (
        <div key={p.id} className="provider-card">
          <div className="provider-card-info">
            <div className="provider-card-name">{p.name}</div>
            <div className="provider-card-meta">
              {providerLabels[p.provider] || p.provider}
              {p.model && ` · ${p.model}`}
            </div>
          </div>
          <div className="provider-card-actions">
            <button className="icon-button" onClick={() => onEdit(p.id)} title={t("edit")}>
              <Edit2 size={14} />
            </button>
            <button className="icon-button" onClick={() => onDelete(p.id)} title={t("delete")}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <button className="add-provider-button" onClick={onAdd}>
        <Plus size={14} /> {t("addProvider")}
      </button>
    </div>
  )
}
