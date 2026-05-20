import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export function ResetConfirmDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>清除所有数据</h2>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>
        <p style={{ margin: "8px 0 12px", lineHeight: 1.6 }}>
          此操作会清空浏览器中的所有题单、答题记录和配置，且不可恢复。请输入「确认」以继续。
        </p>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && value.trim() === "确认") onConfirm(); }}
          placeholder="请输入「确认」"
        />
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button
            style={{ background: "var(--danger)", color: "#fff", borderColor: "var(--danger)" }}
            disabled={value.trim() !== "确认"}
            onClick={onConfirm}
          >
            清除所有数据
          </button>
        </div>
      </div>
    </div>
  );
}
