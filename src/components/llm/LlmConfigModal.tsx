import { useState } from "react"
import { X } from "lucide-react"
import type { LlmProvider, LlmProviderType, LlmScenario } from "../../lib/types"
import { useLlmConfig, useT } from "../../contexts"
import { useEscapeKey } from "../../hooks/useEscapeKey"
import { LlmProviderList } from "./LlmProviderList"
import { LlmProviderEditor } from "./LlmProviderEditor"
import "../../styles/llm/llm.css"

type Tab = "providers" | "scenarios"

export function LlmConfigModal(props: { open: boolean; onClose: () => void }) {
  const t = useT()
  const { providers, addProvider, updateProvider, deleteProvider, assignments, assignProvider } =
    useLlmConfig()
  useEscapeKey(props.onClose, props.open)

  const [tab, setTab] = useState<Tab>("providers")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [draft, setDraft] = useState<Omit<LlmProvider, "id" | "createdAt" | "updatedAt"> | null>(
    null,
  )

  if (!props.open) return null

  const startAdd = () => {
    setDraft({
      name: "",
      provider: "openai" as LlmProviderType,
      endpoint: "",
      apiKey: "",
      model: "",
    })
    setEditingId(null)
    setIsAdding(true)
  }

  const startEdit = (id: string) => {
    const p = providers.find((pv) => pv.id === id)
    if (!p) return
    setDraft({
      name: p.name,
      provider: p.provider,
      endpoint: p.endpoint,
      apiKey: p.apiKey,
      model: p.model,
    })
    setEditingId(id)
    setIsAdding(false)
  }

  const cancelEdit = () => {
    setDraft(null)
    setEditingId(null)
    setIsAdding(false)
  }

  const handleSave = () => {
    if (!draft) return
    if (isAdding) {
      addProvider(draft)
    } else if (editingId) {
      updateProvider(editingId, draft)
    }
    cancelEdit()
  }

  const handleDelete = (id: string) => {
    deleteProvider(id)
    if (editingId === id) cancelEdit()
  }

  const showEditor = draft !== null

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("llmConfigTitle")}</h2>
          <button className="icon-button" onClick={props.onClose}>
            <X size={18} />
          </button>
        </div>

        {showEditor ? (
          <LlmProviderEditor
            provider={draft}
            onChange={setDraft}
            onSave={handleSave}
            onCancel={cancelEdit}
            isNew={isAdding}
          />
        ) : (
          <>
            <div className="config-tabs">
              <button
                className={`config-tab ${tab === "providers" ? "active" : ""}`}
                onClick={() => setTab("providers")}
              >
                {t("providersTab")}
              </button>
              <button
                className={`config-tab ${tab === "scenarios" ? "active" : ""}`}
                onClick={() => setTab("scenarios")}
              >
                {t("scenariosTab")}
              </button>
            </div>

            {tab === "providers" && (
              <LlmProviderList
                providers={providers}
                onEdit={startEdit}
                onDelete={handleDelete}
                onAdd={startAdd}
              />
            )}

            {tab === "scenarios" && (
              <div className="config-grid">
                <label className="field-label wide">
                  {t("parseScenarioLabel")}
                  <select
                    value={assignments.parse || ""}
                    onChange={(e) => assignProvider("parse" as LlmScenario, e.target.value || null)}
                  >
                    <option value="">{t("notAssigned")}</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label wide">
                  {t("fillScenarioLabel")}
                  <select
                    value={assignments.fill || ""}
                    onChange={(e) => assignProvider("fill" as LlmScenario, e.target.value || null)}
                  >
                    <option value="">{t("notAssigned")}</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="modal-actions">
              <button className="primary-button" onClick={props.onClose}>
                {t("done")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
