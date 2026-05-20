import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Download, Loader2, Upload, X } from "lucide-react";

export function ImportSourceDialog({ open, onClose, onFileSelect, onUrlImport }: {
  open: boolean;
  onClose: () => void;
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onUrlImport: (url: string) => Promise<void>;
}) {
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (urlMode) setTimeout(() => inputRef.current?.focus(), 0);
  }, [urlMode]);

  if (!open) return null;

  const handleUrlSubmit = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await onUrlImport(trimmed);
    } finally {
      setLoading(false);
    }
    setUrl("");
    setUrlMode(false);
  };

  return (
    <div className="modal-overlay" onClick={loading ? undefined : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2>导入题目</h2>
          <button className="icon-button" onClick={onClose} disabled={loading}><X size={18} /></button>
        </div>
        <p style={{ margin: "8px 0 16px", lineHeight: 1.6 }}>选择题目来源：</p>
        <div className="import-choice-buttons">
          <label className="import-choice-file-btn">
            <Upload size={16} /> 上传本地 JSON 文件
            <input type="file" accept=".json,application/json" onChange={onFileSelect} />
          </label>
          <button onClick={() => setUrlMode(true)} style={urlMode ? { display: "none" } : undefined}>
            <Download size={16} /> 从 URL 导入 JSON
          </button>
        </div>
        {urlMode && (
          <div style={{ marginTop: 12 }}>
            <label className="field-label">
              JSON 文件 URL
              <input
                ref={inputRef}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleUrlSubmit(); }}
                placeholder="https://example.com/questions.json"
              />
            </label>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "6px 0 0" }}>
              请求将通过 LLM 配置中的 CORS 代理转发（如已配置）。
            </p>
          </div>
        )}
        <div className="modal-actions">
          {urlMode ? (
            <>
              <button onClick={() => { setUrlMode(false); setUrl(""); }} disabled={loading}>返回</button>
              <button
                className="primary-button"
                onClick={handleUrlSubmit}
                disabled={!url.trim() || loading}
              >
                {loading ? <><Loader2 size={16} className="spin" /> 下载中…</> : <><Download size={16} /> 导入</>}
              </button>
            </>
          ) : (
            <button onClick={() => { setUrlMode(false); setUrl(""); onClose(); }}>取消</button>
          )}
        </div>
      </div>
    </div>
  );
}
