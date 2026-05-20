import { useEffect, useRef, useState } from "react";
import { ChevronRight, Eye, EyeOff, Undo2, X } from "lucide-react";
import type { LlmConfig, Toast } from "../../lib/types";
import { testLlmConnection, fetchModelList } from "../../lib/llm";
import { providerPlaceholders, defaultLlmConfig } from "../../utils/constants";
import { Segmented } from "../ui/Segmented";

export function LlmConfigModal(props: {
  open: boolean;
  onClose: () => void;
  config: LlmConfig;
  setConfig: (config: LlmConfig) => void;
  pushToast: (tone: Toast["tone"], message: string) => void;
}) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [showProxyKey, setShowProxyKey] = useState(false);
  const [clearedFields, setClearedFields] = useState<{ model?: string; endpoint?: string; apiKey?: string; proxyUrl?: string; proxyKey?: string }>({});
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const [testing, setTesting] = useState(false);
  const [modelList, setModelList] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  useEffect(() => {
    if (!modelDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [modelDropdownOpen]);

  const updateProvider = (provider: LlmConfig["provider"]) => {
    props.setConfig({ ...props.config, provider, endpoint: "", model: "" });
  };

  const runTest = async () => {
    setTesting(true);
    try {
      const model = await testLlmConnection(props.config);
      props.pushToast("success", `连接成功，模型 ${model} 可用。`);
    } catch (error) {
      props.pushToast("error", error instanceof Error ? error.message : "连接测试失败。");
    } finally {
      setTesting(false);
    }
  };

  const runFetchModels = async () => {
    setFetchingModels(true);
    try {
      const models = await fetchModelList(props.config);
      setModelList(models);
      if (!models.length) {
        props.pushToast("info", "未获取到可用模型。");
      } else {
        props.pushToast("success", `获取到 ${models.length} 个模型。`);
      }
    } catch (error) {
      props.pushToast("error", error instanceof Error ? error.message : "获取模型列表失败。");
    } finally {
      setFetchingModels(false);
    }
  };

  if (!props.open) return null;

  const { config } = props;
  const setConfig = props.setConfig;

  return (
    <div className="modal-overlay" onClick={props.onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>LLM 配置</h2>
          <button className="icon-button" onClick={props.onClose}><X size={18} /></button>
        </div>
        <div className="config-grid">
          <label className="field-label">
            提供商
            <select value={config.provider} onChange={(event) => updateProvider(event.target.value as LlmConfig["provider"])}>
              <option value="openai">OpenAI 兼容</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Gemini</option>
            </select>
          </label>
          <label className="field-label">
            模型
            <div className="model-input-row" ref={modelDropdownRef}>
              <button
                className={`model-dropdown-toggle ${modelDropdownOpen ? "open" : ""}`}
                onClick={() => { if (modelList.length > 0) setModelDropdownOpen((v) => !v); }}
                disabled={modelList.length === 0}
                title={modelList.length > 0 ? "选择模型" : "请先获取模型列表"}
              >
                <ChevronRight size={14} />
              </button>
              <div className="input-with-actions">
                <input
                  value={config.model}
                  placeholder={providerPlaceholders[config.provider].model}
                  onChange={(event) => setConfig({ ...config, model: event.target.value })}
                />
                {config.model
                  ? <button className="input-clear-btn" onClick={() => { setClearedFields((f) => ({ ...f, model: config.model })); setConfig({ ...config, model: "" }); }} title="清空"><X size={14} /></button>
                  : clearedFields.model && <button className="input-clear-btn" onClick={() => { setConfig({ ...config, model: clearedFields.model! }); setClearedFields((f) => ({ ...f, model: undefined })); }} title="恢复"><Undo2 size={14} /></button>
                }
              </div>
              <button
                className="test-button"
                onClick={runFetchModels}
                disabled={fetchingModels || !config.apiKey.trim()}
                title="获取可用模型列表"
              >
                {fetchingModels ? "获取中…" : "获取列表"}
              </button>
              {modelDropdownOpen && modelList.length > 0 && (
                <div className="model-dropdown-list">
                  {modelList.map((m) => (
                    <button key={m} className={m === config.model ? "active" : ""} onClick={() => { setConfig({ ...config, model: m }); setModelDropdownOpen(false); }}>{m}</button>
                  ))}
                </div>
              )}
            </div>
          </label>
          <label className="field-label wide">
            API 地址
            <div className="input-with-actions">
              <input
                value={config.endpoint}
                placeholder={providerPlaceholders[config.provider].endpoint}
                onChange={(event) => setConfig({ ...config, endpoint: event.target.value })}
              />
              {config.endpoint
                ? <button className="input-clear-btn" onClick={() => { setClearedFields((f) => ({ ...f, endpoint: config.endpoint })); setConfig({ ...config, endpoint: "" }); }} title="清空"><X size={14} /></button>
                : clearedFields.endpoint && <button className="input-clear-btn" onClick={() => { setConfig({ ...config, endpoint: clearedFields.endpoint! }); setClearedFields((f) => ({ ...f, endpoint: undefined })); }} title="恢复"><Undo2 size={14} /></button>
              }
            </div>
          </label>
          <label className="field-label wide">
            API Key
            <div className="input-with-actions">
              <input type={showApiKey ? "text" : "password"} placeholder="sk-" value={config.apiKey} onChange={(event) => setConfig({ ...config, apiKey: event.target.value })} />
              {config.apiKey
                ? <button className="input-clear-btn" onClick={() => { setClearedFields((f) => ({ ...f, apiKey: config.apiKey })); setConfig({ ...config, apiKey: "" }); }} title="清空"><X size={14} /></button>
                : clearedFields.apiKey && <button className="input-clear-btn" onClick={() => { setConfig({ ...config, apiKey: clearedFields.apiKey! }); setClearedFields((f) => ({ ...f, apiKey: undefined })); }} title="恢复"><Undo2 size={14} /></button>
              }
              <button className="input-clear-btn" onClick={() => setShowApiKey((v) => !v)} title={showApiKey ? "隐藏" : "显示"}>
                {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </label>
          <label className="field-label wide">
            CORS 代理地址
            <div className="input-with-actions">
              <input
                value={config.proxyUrl}
                placeholder="https://your-worker.workers.dev"
                onChange={(event) => setConfig({ ...config, proxyUrl: event.target.value })}
              />
              {config.proxyUrl
                ? <button className="input-clear-btn" onClick={() => { setClearedFields((f) => ({ ...f, proxyUrl: config.proxyUrl })); setConfig({ ...config, proxyUrl: "" }); }} title="清空"><X size={14} /></button>
                : clearedFields.proxyUrl && <button className="input-clear-btn" onClick={() => { setConfig({ ...config, proxyUrl: clearedFields.proxyUrl! }); setClearedFields((f) => ({ ...f, proxyUrl: undefined })); }} title="恢复"><Undo2 size={14} /></button>
              }
              <button className="input-clear-btn" onClick={() => setConfig({ ...config, proxyUrl: defaultLlmConfig.proxyUrl, proxyKey: defaultLlmConfig.proxyKey })} title="重置为默认代理">
                <Undo2 size={14} />
              </button>
            </div>
          </label>
          <label className="field-label wide">
            代理密钥
            <div className="input-with-actions">
              <input
                type={showProxyKey ? "text" : "password"}
                value={config.proxyKey}
                placeholder="留空则不发送 X-Proxy-Key"
                onChange={(event) => setConfig({ ...config, proxyKey: event.target.value })}
              />
              {config.proxyKey
                ? <button className="input-clear-btn" onClick={() => { setClearedFields((f) => ({ ...f, proxyKey: config.proxyKey })); setConfig({ ...config, proxyKey: "" }); }} title="清空"><X size={14} /></button>
                : clearedFields.proxyKey && <button className="input-clear-btn" onClick={() => { setConfig({ ...config, proxyKey: clearedFields.proxyKey! }); setClearedFields((f) => ({ ...f, proxyKey: undefined })); }} title="恢复"><Undo2 size={14} /></button>
              }
              <button className="input-clear-btn" onClick={() => setConfig({ ...config, proxyKey: defaultLlmConfig.proxyKey })} title="重置为默认密钥">
                <Undo2 size={14} />
              </button>
              <button className="input-clear-btn" onClick={() => setShowProxyKey((v) => !v)} title={showProxyKey ? "隐藏" : "显示"}>
                {showProxyKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </label>
          <div className="field-label">
            <button className="test-button" onClick={runTest} disabled={testing}>
              {testing ? "测试中…" : "测试连接"}
            </button>
          </div>
          <div className="field-label wide">
            <span style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: "block" }}>生成内容</span>
            <Segmented
              value={config.fillAnswer && config.fillExplanation ? "both" : config.fillAnswer ? "answer" : config.fillExplanation ? "explanation" : "none"}
              options={[
                ["both", "答案 + 解析"],
                ["answer", "仅答案"],
                ["explanation", "仅解析"],
                ["none", "仅题目"],
              ]}
              onChange={(v) => setConfig({
                ...config,
                fillAnswer: v === "both" || v === "answer",
                fillExplanation: v === "both" || v === "explanation",
              })}
            />
          </div>
        </div>
        <div className="modal-actions">
          <button className="primary-button" onClick={props.onClose}>完成</button>
        </div>
      </div>
    </div>
  );
}
