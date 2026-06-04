import { useEffect, useRef, useState } from "react"
import { ChevronRight, Eye, EyeOff, Undo2, X } from "lucide-react"
import type { LlmProvider, LlmProviderType } from "../../lib/types"
import { testLlmConnection, fetchModelList } from "../../lib/llm"
import { providerPlaceholders } from "../../utils/constants"
import { useT, usePushToast, useProxy } from "../../contexts"
import { debugLog, debugError } from "../../lib/debug"

interface LlmProviderEditorProps {
  provider: Omit<LlmProvider, "id" | "createdAt" | "updatedAt">
  onChange: (provider: Omit<LlmProvider, "id" | "createdAt" | "updatedAt">) => void
  onSave: () => void
  onCancel: () => void
  isNew?: boolean
}

export function LlmProviderEditor({
  provider,
  onChange,
  onSave,
  onCancel,
  isNew,
}: LlmProviderEditorProps) {
  const t = useT()
  const pushToast = usePushToast()
  const { proxySettings } = useProxy()
  const [showApiKey, setShowApiKey] = useState(false)
  const [clearedFields, setClearedFields] = useState<{
    model?: string
    endpoint?: string
    apiKey?: string
  }>({})
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const [testing, setTesting] = useState(false)
  const [modelList, setModelList] = useState<string[]>([])
  const [fetchingModels, setFetchingModels] = useState(false)
  const hasName = Boolean(provider.name.trim())
  const hasModel = Boolean(provider.model.trim())
  const hasEndpoint = Boolean(provider.endpoint.trim())
  const hasApiKey = Boolean(provider.apiKey.trim())
  const canFetchModels = hasEndpoint && hasApiKey
  const canTestConnection = hasModel && hasEndpoint && hasApiKey
  const canSave = hasName && canTestConnection

  useEffect(() => {
    if (!modelDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [modelDropdownOpen])

  const resolveConfig = () => ({
    provider: provider.provider,
    endpoint: provider.endpoint,
    apiKey: provider.apiKey,
    model: provider.model,
    fillAnswer: false,
    fillExplanation: false,
    ...proxySettings,
  })

  const runTest = async () => {
    debugLog("[LlmProviderEditor] testConnection start", provider.provider, provider.model)
    setTesting(true)
    try {
      const model = await testLlmConnection(resolveConfig(), t)
      debugLog("[LlmProviderEditor] testConnection success", model)
      pushToast("success", t("connectionSuccess", model))
    } catch (error) {
      debugError("[LlmProviderEditor] testConnection failed", error)
      pushToast("error", error instanceof Error ? error.message : t("connectionFailed"))
    } finally {
      setTesting(false)
    }
  }

  const runFetchModels = async () => {
    debugLog("[LlmProviderEditor] fetchModels start", provider.provider, provider.endpoint)
    setFetchingModels(true)
    try {
      const models = await fetchModelList(resolveConfig(), t)
      debugLog("[LlmProviderEditor] fetchModels result", models.length, "models")
      setModelList(models)
      if (!models.length) {
        pushToast("info", t("noModelsFound"))
      } else {
        pushToast("success", t("modelsFound", models.length))
      }
    } catch (error) {
      debugError("[LlmProviderEditor] fetchModels failed", error)
      pushToast("error", error instanceof Error ? error.message : t("fetchModelsFailed"))
    } finally {
      setFetchingModels(false)
    }
  }

  const updateProviderType = (type: LlmProviderType) => {
    debugLog("[LlmProviderEditor] updateProviderType", type)
    onChange({ ...provider, provider: type, endpoint: "", model: "" })
  }

  return (
    <>
      <div className="config-grid">
        <label className="field-label wide">
          {t("providerNameLabel")}
          <input
            value={provider.name}
            placeholder={t("providerNamePlaceholder")}
            onChange={(e) => onChange({ ...provider, name: e.target.value })}
          />
        </label>
        <label className="field-label">
          {t("providerLabel")}
          <select
            value={provider.provider}
            onChange={(e) => updateProviderType(e.target.value as LlmProviderType)}
          >
            <option value="openai">{t("openAiCompatible")}</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Gemini</option>
          </select>
        </label>
        <label className="field-label">
          {t("modelLabel")}
          <div className="model-input-row" ref={modelDropdownRef}>
            <button
              className={`model-dropdown-toggle ${modelDropdownOpen ? "open" : ""}`}
              onClick={() => {
                if (modelList.length > 0) setModelDropdownOpen((v) => !v)
              }}
              disabled={modelList.length === 0}
              title={modelList.length > 0 ? t("selectModel") : t("fetchModelListFirst")}
            >
              <ChevronRight size={14} />
            </button>
            <div className="input-with-actions">
              <input
                value={provider.model}
                placeholder={providerPlaceholders[provider.provider].model}
                onChange={(e) => onChange({ ...provider, model: e.target.value })}
              />
              {provider.model ? (
                <button
                  className="input-clear-btn"
                  onClick={() => {
                    setClearedFields((f) => ({ ...f, model: provider.model }))
                    onChange({ ...provider, model: "" })
                  }}
                  title={t("clear")}
                >
                  <X size={14} />
                </button>
              ) : (
                clearedFields.model && (
                  <button
                    className="input-clear-btn"
                    onClick={() => {
                      onChange({ ...provider, model: clearedFields.model! })
                      setClearedFields((f) => ({ ...f, model: undefined }))
                    }}
                    title={t("restore")}
                  >
                    <Undo2 size={14} />
                  </button>
                )
              )}
            </div>
            <button
              className="test-button"
              onClick={runFetchModels}
              disabled={fetchingModels || !canFetchModels}
              title={t("fetchModelListTitle")}
            >
              {fetchingModels ? t("fetchingModels") : t("fetchModelList")}
            </button>
            {modelDropdownOpen && modelList.length > 0 && (
              <div className="model-dropdown-list">
                {modelList.map((m) => (
                  <button
                    key={m}
                    className={m === provider.model ? "active" : ""}
                    onClick={() => {
                      onChange({ ...provider, model: m })
                      setModelDropdownOpen(false)
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </label>
        <label className="field-label wide">
          {t("apiUrlLabel")}
          <div className="input-with-actions">
            <input
              value={provider.endpoint}
              placeholder={providerPlaceholders[provider.provider].endpoint}
              onChange={(e) => onChange({ ...provider, endpoint: e.target.value })}
            />
            {provider.endpoint ? (
              <button
                className="input-clear-btn"
                onClick={() => {
                  setClearedFields((f) => ({ ...f, endpoint: provider.endpoint }))
                  onChange({ ...provider, endpoint: "" })
                }}
                title={t("clear")}
              >
                <X size={14} />
              </button>
            ) : (
              clearedFields.endpoint && (
                <button
                  className="input-clear-btn"
                  onClick={() => {
                    onChange({ ...provider, endpoint: clearedFields.endpoint! })
                    setClearedFields((f) => ({ ...f, endpoint: undefined }))
                  }}
                  title={t("restore")}
                >
                  <Undo2 size={14} />
                </button>
              )
            )}
          </div>
        </label>
        <label className="field-label wide">
          {t("apiKeyLabel")}
          <div className="input-with-actions">
            <input
              type={showApiKey ? "text" : "password"}
              placeholder="sk-"
              value={provider.apiKey}
              onChange={(e) => onChange({ ...provider, apiKey: e.target.value })}
            />
            {provider.apiKey ? (
              <button
                className="input-clear-btn"
                onClick={() => {
                  setClearedFields((f) => ({ ...f, apiKey: provider.apiKey }))
                  onChange({ ...provider, apiKey: "" })
                }}
                title={t("clear")}
              >
                <X size={14} />
              </button>
            ) : (
              clearedFields.apiKey && (
                <button
                  className="input-clear-btn"
                  onClick={() => {
                    onChange({ ...provider, apiKey: clearedFields.apiKey! })
                    setClearedFields((f) => ({ ...f, apiKey: undefined }))
                  }}
                  title={t("restore")}
                >
                  <Undo2 size={14} />
                </button>
              )
            )}
            <button
              className="input-clear-btn"
              onClick={() => setShowApiKey((v) => !v)}
              title={showApiKey ? t("hide") : t("show")}
            >
              {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <small className="secret-storage-hint">{t("apiKeyStorageHint")}</small>
        </label>
        <div className="field-label">
          <button
            className="test-button"
            onClick={runTest}
            disabled={testing || !canTestConnection}
          >
            {testing ? t("testing") : t("testConnection")}
          </button>
        </div>
      </div>
      <div className="modal-actions">
        <button className="secondary-button" onClick={onCancel}>
          {t("cancel")}
        </button>
        <button
          className="primary-button"
          onClick={onSave}
          disabled={!canSave}
        >
          {isNew ? t("addProvider") : t("saveProvider")}
        </button>
      </div>
    </>
  )
}
