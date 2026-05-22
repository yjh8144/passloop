import { useEffect, useRef, useState } from "react"
import { ChevronRight, Eye, EyeOff, HelpCircle, Undo2, X } from "lucide-react"
import type { LlmConfig } from "../../lib/types"
import { testLlmConnection, fetchModelList } from "../../lib/llm"
import { providerPlaceholders, defaultLlmConfig } from "../../utils/constants"
import { Segmented } from "../ui/Segmented"
import { useT, usePushToast } from "../../contexts"

export function LlmConfigModal(props: {
  open: boolean
  onClose: () => void
  config: LlmConfig
  setConfig: (config: LlmConfig) => void
}) {
  const t = useT()
  const pushToast = usePushToast()
  const [showApiKey, setShowApiKey] = useState(false)
  const [showProxyKey, setShowProxyKey] = useState(false)
  const [showProxyHelp, setShowProxyHelp] = useState(false)
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

  const updateProvider = (provider: LlmConfig["provider"]) => {
    props.setConfig({ ...props.config, provider, endpoint: "", model: "" })
  }

  const runTest = async () => {
    setTesting(true)
    try {
      const model = await testLlmConnection(props.config)
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
      const models = await fetchModelList(props.config)
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

  if (!props.open) return null

  const { config } = props
  const setConfig = props.setConfig

  return (
    <>
      <div className="modal-overlay" onClick={props.onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{t("llmConfigTitle")}</h2>
            <button className="icon-button" onClick={props.onClose}>
              <X size={18} />
            </button>
          </div>
          <div className="config-grid">
            <label className="field-label">
              {t("providerLabel")}
              <select
                value={config.provider}
                onChange={(event) => updateProvider(event.target.value as LlmConfig["provider"])}
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
                    value={config.model}
                    placeholder={providerPlaceholders[config.provider].model}
                    onChange={(event) => setConfig({ ...config, model: event.target.value })}
                  />
                  {config.model ? (
                    <button
                      className="input-clear-btn"
                      onClick={() => {
                        setClearedFields((f) => ({ ...f, model: config.model }))
                        setConfig({ ...config, model: "" })
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
                          setConfig({ ...config, model: clearedFields.model! })
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
                  disabled={fetchingModels || !config.apiKey.trim()}
                  title={t("fetchModelListTitle")}
                >
                  {fetchingModels ? t("fetchingModels") : t("fetchModelList")}
                </button>
                {modelDropdownOpen && modelList.length > 0 && (
                  <div className="model-dropdown-list">
                    {modelList.map((m) => (
                      <button
                        key={m}
                        className={m === config.model ? "active" : ""}
                        onClick={() => {
                          setConfig({ ...config, model: m })
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
                  value={config.endpoint}
                  placeholder={providerPlaceholders[config.provider].endpoint}
                  onChange={(event) => setConfig({ ...config, endpoint: event.target.value })}
                />
                {config.endpoint ? (
                  <button
                    className="input-clear-btn"
                    onClick={() => {
                      setClearedFields((f) => ({ ...f, endpoint: config.endpoint }))
                      setConfig({ ...config, endpoint: "" })
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
                        setConfig({ ...config, endpoint: clearedFields.endpoint! })
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
                  value={config.apiKey}
                  onChange={(event) => setConfig({ ...config, apiKey: event.target.value })}
                />
                {config.apiKey ? (
                  <button
                    className="input-clear-btn"
                    onClick={() => {
                      setClearedFields((f) => ({ ...f, apiKey: config.apiKey }))
                      setConfig({ ...config, apiKey: "" })
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
                        setConfig({ ...config, apiKey: clearedFields.apiKey! })
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
            <label className="field-label wide" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={config.proxyEnabled}
                onChange={(event) => setConfig({ ...config, proxyEnabled: event.target.checked })}
              />
              <span>{t("proxyToggleLabel")}</span>
            </label>
            {!config.proxyEnabled && (
              <div className="field-label wide" style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -8 }}>
                {t("proxyDisabledHint")}
              </div>
            )}
            <label className="field-label wide" style={{ opacity: config.proxyEnabled ? 1 : 0.5 }}>
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
              </span>
              <div className="input-with-actions">
                <input
                  value={config.proxyUrl}
                  placeholder="https://your-worker.workers.dev"
                  onChange={(event) => setConfig({ ...config, proxyUrl: event.target.value })}
                  disabled={!config.proxyEnabled}
                />
                {config.proxyUrl ? (
                  <button
                    className="input-clear-btn"
                    onClick={() => {
                      setClearedFields((f) => ({ ...f, proxyUrl: config.proxyUrl }))
                      setConfig({ ...config, proxyUrl: "" })
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
                        setConfig({ ...config, proxyUrl: clearedFields.proxyUrl! })
                        setClearedFields((f) => ({ ...f, proxyUrl: undefined }))
                      }}
                      title={t("restore")}
                    >
                      <Undo2 size={14} />
                    </button>
                  )
                )}
                <button
                  className="input-clear-btn"
                  onClick={() =>
                    setConfig({
                      ...config,
                      proxyUrl: defaultLlmConfig.proxyUrl,
                      proxyKey: defaultLlmConfig.proxyKey,
                    })
                  }
                  title={t("resetToDefaultProxy")}
                >
                  <Undo2 size={14} />
                </button>
              </div>
            </label>
            <label className="field-label wide" style={{ opacity: config.proxyEnabled ? 1 : 0.5 }}>
              {t("proxyKeyLabel")}
              <div className="input-with-actions">
                <input
                  type={showProxyKey ? "text" : "password"}
                  value={config.proxyKey}
                  placeholder={t("proxyKeyPlaceholder")}
                  onChange={(event) => setConfig({ ...config, proxyKey: event.target.value })}
                  disabled={!config.proxyEnabled}
                />
                {config.proxyKey ? (
                  <button
                    className="input-clear-btn"
                    onClick={() => {
                      setClearedFields((f) => ({ ...f, proxyKey: config.proxyKey }))
                      setConfig({ ...config, proxyKey: "" })
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
                        setConfig({ ...config, proxyKey: clearedFields.proxyKey! })
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
                  onClick={() => setConfig({ ...config, proxyKey: defaultLlmConfig.proxyKey })}
                  title={t("resetToDefaultKey")}
                >
                  <Undo2 size={14} />
                </button>
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
              <button className="test-button" onClick={runTest} disabled={testing}>
                {testing ? t("testing") : t("testConnection")}
              </button>
            </div>
            <div className="field-label wide">
              <span style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: "block" }}>
                {t("generateContentLabel")}
              </span>
              <Segmented
                value={
                  config.fillAnswer && config.fillExplanation
                    ? "both"
                    : config.fillAnswer
                      ? "answer"
                      : config.fillExplanation
                        ? "explanation"
                        : "none"
                }
                options={[
                  ["both", t("answerPlusExplanation")],
                  ["answer", t("onlyAnswer")],
                  ["explanation", t("onlyExplanation")],
                  ["none", t("onlyQuestions")],
                ]}
                onChange={(v) =>
                  setConfig({
                    ...config,
                    fillAnswer: v === "both" || v === "answer",
                    fillExplanation: v === "both" || v === "explanation",
                  })
                }
              />
            </div>
          </div>
          <div className="modal-actions">
            <button className="primary-button" onClick={props.onClose}>
              {t("done")}
            </button>
          </div>
        </div>
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
    </>
  )
}
