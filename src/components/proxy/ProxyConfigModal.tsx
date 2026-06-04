import { useRef, useState } from "react"
import { Eye, EyeOff, HelpCircle, List, Undo2, X } from "lucide-react"
import type { ProxySettings } from "../../lib/types"
import { useT } from "../../contexts"
import { useEscapeKey } from "../../hooks/useEscapeKey"
import { PRESET_PROXIES } from "../../utils/constants"

type ProxyTestInfo = { status: "idle" | "testing" | "alive" | "dead"; latency?: number }

export function ProxyConfigModal(props: {
  open: boolean
  onClose: () => void
  proxySettings: ProxySettings
  updateProxySettings: (patch: Partial<ProxySettings>) => void
}) {
  const t = useT()
  const { proxySettings, updateProxySettings } = props
  const [showProxyKey, setShowProxyKey] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showList, setShowList] = useState(false)
  const [clearedFields, setClearedFields] = useState<{ proxyUrl?: string; proxyKey?: string }>({})
  const [currentProxyStatus, setCurrentProxyStatus] = useState<ProxyTestInfo>({ status: "idle" })
  const [proxyStatus, setProxyStatus] = useState<Record<string, ProxyTestInfo>>({})
  const currentProxyTestId = useRef(0)

  // Esc closes a nested sub-dialog first (help/list), then the modal itself.
  useEscapeKey(() => {
    if (showHelp) setShowHelp(false)
    else if (showList) setShowList(false)
    else props.onClose()
  }, props.open)

  if (!props.open) return null

  const resetCurrentProxyStatus = () => {
    currentProxyTestId.current += 1
    setCurrentProxyStatus({ status: "idle" })
  }

  const measureProxy = async (url: string, key?: string): Promise<ProxyTestInfo> => {
    const start = Date.now()
    try {
      const res = await fetch(
        `${url.replace(/\/+$/, "")}/?url=${encodeURIComponent("https://httpbin.org/get")}`,
        {
          headers: key ? { "X-Proxy-Key": key } : undefined,
          signal: AbortSignal.timeout(8000),
        },
      )
      if (res.ok) {
        return { status: "alive", latency: Date.now() - start }
      }
      return { status: "dead" }
    } catch {
      return { status: "dead" }
    }
  }

  const testProxy = async (url: string, key?: string) => {
    setProxyStatus((s) => ({ ...s, [url]: { status: "testing" } }))
    const result = await measureProxy(url, key)
    setProxyStatus((s) => ({ ...s, [url]: result }))
  }

  const testCurrentProxy = async () => {
    const url = proxySettings.proxyUrl.trim()
    if (!url || !proxySettings.proxyEnabled) return
    const testId = currentProxyTestId.current + 1
    currentProxyTestId.current = testId
    setCurrentProxyStatus({ status: "testing" })
    const result = await measureProxy(url, proxySettings.proxyKey.trim())
    if (currentProxyTestId.current === testId) {
      setCurrentProxyStatus(result)
    }
  }

  const testAllProxies = () => {
    PRESET_PROXIES.forEach((p) => testProxy(p.url))
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("proxySettingsTitle")}</h2>
          <button className="icon-button" onClick={props.onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="config-grid">
          <label
            className="field-label wide"
            style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <input
              type="checkbox"
              checked={proxySettings.proxyEnabled}
              onChange={(e) => {
                resetCurrentProxyStatus()
                updateProxySettings({ proxyEnabled: e.target.checked })
              }}
              style={{ width: "auto", height: "auto" }}
            />
            <span>{t("proxyToggleLabel")}</span>
          </label>
          {!proxySettings.proxyEnabled && (
            <div
              className="field-label wide"
              style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -8 }}
            >
              {t("proxyDisabledHint")}
            </div>
          )}
          <label
            className="field-label wide"
            style={{ opacity: proxySettings.proxyEnabled ? 1 : 0.5 }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {t("proxyUrlLabel")}
              <button
                className="icon-button"
                style={{ padding: 2 }}
                onClick={() => setShowHelp(true)}
                title={t("whatIsCorsProxy")}
              >
                <HelpCircle size={14} />
              </button>
              <button
                className="icon-button"
                style={{ padding: 2 }}
                onClick={() => setShowList(true)}
                title={t("proxyListTitle")}
              >
                <List size={14} />
              </button>
            </span>
            <div className="input-with-actions">
              <input
                value={proxySettings.proxyUrl}
                placeholder="https://your-worker.workers.dev"
                onChange={(e) => {
                  resetCurrentProxyStatus()
                  updateProxySettings({ proxyUrl: e.target.value })
                }}
                disabled={!proxySettings.proxyEnabled}
              />
              {proxySettings.proxyUrl ? (
                <button
                  className="input-clear-btn"
                  onClick={() => {
                    setClearedFields((f) => ({ ...f, proxyUrl: proxySettings.proxyUrl }))
                    resetCurrentProxyStatus()
                    updateProxySettings({ proxyUrl: "" })
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
                      resetCurrentProxyStatus()
                      updateProxySettings({ proxyUrl: clearedFields.proxyUrl! })
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
          <label
            className="field-label wide"
            style={{ opacity: proxySettings.proxyEnabled ? 1 : 0.5 }}
          >
            {t("proxyKeyLabel")}
            <div className="input-with-actions">
              <input
                type={showProxyKey ? "text" : "password"}
                value={proxySettings.proxyKey}
                placeholder={t("proxyKeyPlaceholder")}
                onChange={(e) => {
                  resetCurrentProxyStatus()
                  updateProxySettings({ proxyKey: e.target.value })
                }}
                disabled={!proxySettings.proxyEnabled}
              />
              {proxySettings.proxyKey ? (
                <button
                  className="input-clear-btn"
                  onClick={() => {
                    setClearedFields((f) => ({ ...f, proxyKey: proxySettings.proxyKey }))
                    resetCurrentProxyStatus()
                    updateProxySettings({ proxyKey: "" })
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
                      resetCurrentProxyStatus()
                      updateProxySettings({ proxyKey: clearedFields.proxyKey! })
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
          <div
            className="field-label wide"
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              opacity: proxySettings.proxyEnabled ? 1 : 0.5,
            }}
          >
            <button
              className="test-button"
              style={{ marginTop: 0 }}
              onClick={testCurrentProxy}
              disabled={
                !proxySettings.proxyEnabled ||
                !proxySettings.proxyUrl.trim() ||
                currentProxyStatus.status === "testing"
              }
            >
              {currentProxyStatus.status === "testing" ? t("proxyListTesting") : t("proxyListTest")}
            </button>
            {currentProxyStatus.status === "alive" && (
              <span style={{ fontSize: 12, color: "#22c55e" }}>
                {t("proxyListAlive")}
                {currentProxyStatus.latency != null ? ` ${currentProxyStatus.latency}ms` : ""}
              </span>
            )}
            {currentProxyStatus.status === "dead" && (
              <span style={{ fontSize: 12, color: "#ef4444" }}>{t("proxyListDead")}</span>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button className="primary-button" onClick={props.onClose}>
            {t("done")}
          </button>
        </div>

        {showHelp && (
          <div
            className="modal-overlay"
            style={{ zIndex: 1100 }}
            onClick={() => setShowHelp(false)}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 500 }}
            >
              <div className="modal-header">
                <h2>{t("corsExplainTitle")}</h2>
                <button className="icon-button" onClick={() => setShowHelp(false)}>
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
                <button className="primary-button" onClick={() => setShowHelp(false)}>
                  {t("understood")}
                </button>
              </div>
            </div>
          </div>
        )}
        {showList && (
          <div
            className="modal-overlay"
            style={{ zIndex: 1100 }}
            onClick={() => setShowList(false)}
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
                  <button className="icon-button" onClick={() => setShowList(false)}>
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
                        resetCurrentProxyStatus()
                        updateProxySettings({ proxyUrl: proxy.url, proxyKey: "" })
                        setShowList(false)
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
                            {t("proxyListAlive")}
                            {info.latency != null ? ` ${info.latency}ms` : ""}
                          </span>
                        )}
                        {status === "dead" && (
                          <span style={{ fontSize: 12, color: "#ef4444" }}>
                            {t("proxyListDead")}
                          </span>
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
      </div>
    </div>
  )
}
