import { useEffect, useRef, useState } from "react"
import { ChevronRight, Eye, EyeOff, HelpCircle, List, Undo2, X } from "lucide-react"
import type { LlmProvider, LlmProviderType } from "../../lib/types"
import { testLlmConnection, fetchModelList } from "../../lib/llm"
import { providerPlaceholders, PRESET_PROXIES } from "../../utils/constants"
import { useT, usePushToast } from "../../contexts"
import { debugError } from "../../lib/debug"

interface LlmProviderEditorProps {
  provider: Omit<LlmProvider, "id" | "createdAt" | "updatedAt">
  onChange: (provider: Omit<LlmProvider, "id" | "createdAt" | "updatedAt">) => void
  onSave: () => void
  onCancel: () => void
  isNew?: boolean
}

export function LlmProviderEditor({ provider, onChange, onSave, onCancel, isNew }: LlmProviderEditorProps) {
  const t = useT()
  const pushToast = usePushToast()
  const [showApiKey, setShowApiKey] = useState(false)
  const [showProxyKey, setShowProxyKey] = useState(false)
  const [showProxyHelp, setShowProxyHelp] = useState(false)
  const [showProxyList, setShowProxyList] = useState(false)
  const [clearedFields, setClearedFields] = useState<{
    model?: string
    endpoint?: string
    apiKey?: string
    proxyUrl?: string
    proxyKey?: string
  }>({})
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const [testing, setTesting] = useState(false)
  const [modelList, setModelList] = useState<string[]>([])
  const [fetchingModels, setFetchingModels] = useState(false)
  const [proxyStatus, setProxyStatus] = useState<Record<string, { status: "idle" | "testing" | "alive" | "dead"; latency?: number }>>({})

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
    proxyEnabled: provider.proxyEnabled,
    proxyUrl: provider.proxyUrl,
    proxyKey: provider.proxyKey,
  })

  const runTest = async () => {
    setTesting(true)
    try {
      const model = await testLlmConnection(resolveConfig())
      pushToast("success", t("connectionSuccess", model))
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : t("connectionFailed"))
    } finally {
      setTesting(false)
    }
  }

  const runFetchModels = async () => {
    setFetchingModels(true)
    try {
      const models = await fetchModelList(resolveConfig())
      setModelList(models)
      if (!models.length) {
        pushToast("info", t("noModelsFound"))
      } else {
        pushToast("success", t("modelsFound", models.length))
      }
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : t("fetchModelsFailed"))
    } finally {
      setFetchingModels(false)
    }
  }

  const testProxy = async (url: string) => {
    setProxyStatus((s) => ({ ...s, [url]: { status: "testing" } }))
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 5000)
      const start = performance.now()
      await fetch(url.replace(/\/+$/, "") + "/", { signal: controller.signal })
      const latency = Math.round(performance.now() - start)
      clearTimeout(timer)
      setProxyStatus((s) => ({ ...s, [url]: { status: "alive", latency } }))
    } catch (e) {
      debugError("testProxy failed", url, e)
      setProxyStatus((s) => ({ ...s, [url]: { status: "dead" } }))
    }
  }

  const testAllProxies = () => {
    PRESET_PROXIES.forEach((proxy) => testProxy(proxy.url))
  }

  const updateProviderType = (type: LlmProviderType) => {
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
              disabled={fetchingModels || !provider.apiKey.trim()}
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
        </label>
        <label className="field-label wide" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={provider.proxyEnabled}
            onChange={(e) => onChange({ ...provider, proxyEnabled: e.target.checked })}
            style={{ width: "auto", height: "auto" }}
          />
          <span>{t("proxyToggleLabel")}</span>
        </label>
        {!provider.proxyEnabled && (
          <div className="field-label wide" style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -8 }}>
            {t("proxyDisabledHint")}
          </div>
        )}
        <label className="field-label wide" style={{ opacity: provider.proxyEnabled ? 1 : 0.5 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {t("proxyUrlLabel")}
            <button
              className="icon-button"
              style={{ padding: 2 }}
              onClick={() => setShowProxyHelp(true)}
              title={t("whatIsCorsProxy")}
            >
              <HelpCircle size={14} />
            </button>
            <button
              className="icon-button"
              style={{ padding: 2 }}
              onClick={() => setShowProxyList(true)}
              title={t("proxyListTitle")}
            >
              <List size={14} />
            </button>
          </span>
          <div className="input-with-actions">
            <input
              value={provider.proxyUrl}
              placeholder="https://your-worker.workers.dev"
              onChange={(e) => onChange({ ...provider, proxyUrl: e.target.value })}
              disabled={!provider.proxyEnabled}
            />
            {provider.proxyUrl ? (
              <button
                className="input-clear-btn"
                onClick={() => {
                  setClearedFields((f) => ({ ...f, proxyUrl: provider.proxyUrl }))
                  onChange({ ...provider, proxyUrl: "" })
                }}
                title={t("clear")}
              >
                <X size={14} />
              </button>
            ) : (
              clearedFields.proxyUrl && (
                <button
                  className="input-clear-btn"
                  onClick={() => {
                    onChange({ ...provider, proxyUrl: clearedFields.proxyUrl! })
                    setClearedFields((f) => ({ ...f, proxyUrl: undefined }))
                  }}
                  title={t("restore")}
                >
                  <Undo2 size={14} />
                </button>
              )
            )}
          </div>
        </label>
        <label className="field-label wide" style={{ opacity: provider.proxyEnabled ? 1 : 0.5 }}>
          {t("proxyKeyLabel")}
          <div className="input-with-actions">
            <input
              type={showProxyKey ? "text" : "password"}
              value={provider.proxyKey}
              placeholder={t("proxyKeyPlaceholder")}
              onChange={(e) => onChange({ ...provider, proxyKey: e.target.value })}
              disabled={!provider.proxyEnabled}
            />
            {provider.proxyKey ? (
              <button
                className="input-clear-btn"
                onClick={() => {
                  setClearedFields((f) => ({ ...f, proxyKey: provider.proxyKey }))
                  onChange({ ...provider, proxyKey: "" })
                }}
                title={t("clear")}
              >
                <X size={14} />
              </button>
            ) : (
              clearedFields.proxyKey && (
                <button
                  className="input-clear-btn"
                  onClick={() => {
                    onChange({ ...provider, proxyKey: clearedFields.proxyKey! })
                    setClearedFields((f) => ({ ...f, proxyKey: undefined }))
                  }}
                  title={t("restore")}
                >
                  <Undo2 size={14} />
                </button>
              )
            )}
            <button
              className="input-clear-btn"
              onClick={() => setShowProxyKey((v) => !v)}
              title={showProxyKey ? t("hide") : t("show")}
            >
              {showProxyKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </label>
        <div className="field-label">
          <button className="test-button" onClick={runTest} disabled={testing || !provider.apiKey.trim()}>
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
          disabled={!provider.name.trim() || !provider.apiKey.trim()}
        >
          {isNew ? t("addProvider") : t("saveProvider")}
        </button>
      </div>
      {showProxyHelp && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1100 }}
          onClick={() => setShowProxyHelp(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 500 }}
          >
            <div className="modal-header">
              <h2>{t("corsExplainTitle")}</h2>
              <button className="icon-button" onClick={() => setShowProxyHelp(false)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ lineHeight: 1.8, fontSize: "0.92rem" }}>
              <p style={{ marginBottom: 12 }}>
                <strong>CORS</strong> — {t("corsExplain1")}
              </p>
              <p style={{ marginBottom: 12 }}>{t("corsExplain2")}</p>
              <p style={{ marginBottom: 12 }}>{t("corsExplain3")}</p>
              <p style={{ marginBottom: 12 }}>
                {t("corsExplain4")}
                <br />
                <span style={{ color: "var(--text-muted)" }}>{t("corsExplainFlow")}</span>
              </p>
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>
                {t("corsExplain5")}
              </p>
              <p style={{ marginTop: 12 }}>
                <a
                  href="https://github.com/yjh8144/passloop/tree/main/proxy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)" }}
                >
                  {t("viewDeployGuide")}
                </a>
              </p>
            </div>
            <div className="modal-actions">
              <button className="primary-button" onClick={() => setShowProxyHelp(false)}>
                {t("understood")}
              </button>
            </div>
          </div>
        </div>
      )}
      {showProxyList && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1100 }}
          onClick={() => setShowProxyList(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460 }}
          >
            <div className="modal-header">
              <h2>{t("proxyListTitle")}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  className="test-button"
                  style={{ padding: "4px 10px", fontSize: 12 }}
                  onClick={testAllProxies}
                >
                  {t("proxyListTestAll")}
                </button>
                <button className="icon-button" onClick={() => setShowProxyList(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PRESET_PROXIES.map((proxy) => {
                const info = proxyStatus[proxy.url] ?? { status: "idle" }
                const status = info.status
                return (
                  <div
                    key={proxy.url}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      onChange({ ...provider, proxyUrl: proxy.url, proxyKey: proxy.key })
                      setShowProxyList(false)
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{proxy.name}</div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {proxy.url}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {status === "alive" && (
                        <span style={{ fontSize: 12, color: "#22c55e" }}>
                          {t("proxyListAlive")}{info.latency != null ? ` ${info.latency}ms` : ""}
                        </span>
                      )}
                      {status === "dead" && (
                        <span style={{ fontSize: 12, color: "#ef4444" }}>{t("proxyListDead")}</span>
                      )}
                      <button
                        className="test-button"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                        disabled={status === "testing"}
                        onClick={(e) => {
                          e.stopPropagation()
                          testProxy(proxy.url)
                        }}
                      >
                        {status === "testing" ? t("proxyListTesting") : t("proxyListTest")}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
