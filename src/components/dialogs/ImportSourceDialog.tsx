import { useEffect, useRef, useState } from "react"
import type { ChangeEvent } from "react"
import { Globe, Loader2, Upload, X } from "lucide-react"
import { useT } from "../../contexts"
import { useEscapeKey } from "../../hooks/useEscapeKey"

export function ImportSourceDialog({
  open,
  title,
  description,
  onClose,
  onFileSelect,
  onUrlImport,
}: {
  open: boolean
  title?: string
  description?: string
  onClose: () => void
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void
  onUrlImport: (url: string) => Promise<void>
}) {
  const t = useT()
  const [urlMode, setUrlMode] = useState(false)
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (urlMode) setTimeout(() => inputRef.current?.focus(), 0)
  }, [urlMode])

  useEscapeKey(() => {
    if (!loading) onClose()
  }, open)

  if (!open) return null

  const handleUrlSubmit = async () => {
    const trimmed = url.trim()
    if (!trimmed) return
    setLoading(true)
    try {
      await onUrlImport(trimmed)
    } finally {
      setLoading(false)
    }
    setUrl("")
    setUrlMode(false)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2>{title ?? t("importTitle")}</h2>
          <button className="icon-button" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>
        <p style={{ margin: "8px 0 16px", lineHeight: 1.6 }}>
          {description ?? t("selectImportSource")}
        </p>
        <div className="import-choice-buttons">
          <label className="import-choice-file-btn">
            <Upload size={16} /> {t("uploadLocalJsonFile")}
            <input type="file" accept=".json,application/json" onChange={onFileSelect} />
          </label>
          <button
            onClick={() => setUrlMode(true)}
            style={urlMode ? { display: "none" } : undefined}
          >
            <Globe size={16} /> {t("importFromUrl")}
          </button>
        </div>
        {urlMode && (
          <div style={{ marginTop: 12 }}>
            <label className="field-label">
              {t("jsonFileUrl")}
              <input
                ref={inputRef}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUrlSubmit()
                }}
                placeholder="https://example.com/questions.json"
              />
            </label>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "6px 0 0" }}>
              {t("corsProxyNote")}
            </p>
          </div>
        )}
        <div className="modal-actions">
          {urlMode ? (
            <>
              <button
                onClick={() => {
                  setUrlMode(false)
                  setUrl("")
                }}
                disabled={loading}
              >
                {t("back")}
              </button>
              <button
                className="primary-button"
                onClick={handleUrlSubmit}
                disabled={!url.trim() || loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spin" /> {t("downloading")}
                  </>
                ) : (
                  <>
                    <Globe size={16} /> {t("import")}
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setUrlMode(false)
                setUrl("")
                onClose()
              }}
            >
              {t("cancel")}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
