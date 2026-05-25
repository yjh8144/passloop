import { useState } from "react"
import { Check, Edit2, Loader2, Plus, Trash2, Plug, X } from "lucide-react"
import type { LlmProvider } from "../../lib/types"
import { useT } from "../../contexts"
import { testLlmConnection } from "../../lib/llm"
import { useLlmConfig } from "../../contexts/LlmConfigContext"

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

type CheckStatus = "idle" | "checking" | "ok" | "fail"

export function LlmProviderList({ providers, onEdit, onDelete, onAdd }: LlmProviderListProps) {
  const t = useT()
  const { resolveProvider } = useLlmConfig()
  const [statuses, setStatuses] = useState<Record<string, CheckStatus>>({})

  const handleCheck = async (id: string) => {
    const config = resolveProvider(id)
    if (!config) return
    setStatuses((s) => ({ ...s, [id]: "checking" }))
    try {
      await testLlmConnection(config)
      setStatuses((s) => ({ ...s, [id]: "ok" }))
    } catch {
      setStatuses((s) => ({ ...s, [id]: "fail" }))
    }
  }

  const getStatusIcon = (id: string) => {
    const status = statuses[id] || "idle"
    switch (status) {
      case "checking":
        return <Loader2 size={14} className="spin" />
      case "ok":
        return <Check size={14} style={{ color: "var(--color-success, #22c55e)" }} />
      case "fail":
        return <X size={14} style={{ color: "var(--color-error, #ef4444)" }} />
      default:
        return <Plug size={14} />
    }
  }

  return (
    <div className="provider-list">
      {providers.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "24px 0",
            color: "var(--text-muted)",
            fontSize: 14,
          }}
        >
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
            <button
              className="icon-button"
              onClick={() => handleCheck(p.id)}
              disabled={statuses[p.id] === "checking"}
              title={t("checkAvailability")}
            >
              {getStatusIcon(p.id)}
            </button>
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
