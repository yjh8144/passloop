import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { AppData } from "../../lib/types";

export function BackupImportDialog({ data, onClose, onChoose }: {
  data: AppData | null;
  onClose: () => void;
  onChoose: (mode: "overwrite" | "merge") => void;
}) {
  const [step, setStep] = useState<"choose" | "confirm">("choose");
  const [confirmText, setConfirmText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) { setStep("choose"); setConfirmText(""); }
  }, [data]);

  useEffect(() => {
    if (step === "confirm") setTimeout(() => inputRef.current?.focus(), 0);
  }, [step]);

  if (!data) return null;

  if (step === "confirm") {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>确认覆盖</h2>
            <button className="icon-button" onClick={onClose}><X size={18} /></button>
          </div>
          <p style={{ margin: "8px 0 12px", lineHeight: 1.6, color: "var(--danger)" }}>
            覆盖将删除当前所有题单、刷题记录和设置，替换为导入文件中的内容。此操作不可撤销。
          </p>
          <p style={{ margin: "0 0 8px", fontSize: "0.88rem" }}>
            请输入「确认覆盖」以继续：
          </p>
          <input
            ref={inputRef}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="确认覆盖"
            onKeyDown={(e) => { if (e.key === "Enter" && confirmText === "确认覆盖") { onChoose("overwrite"); } }}
          />
          <div className="modal-actions">
            <button onClick={() => setStep("choose")}>返回</button>
            <button
              style={{ background: "var(--danger)", color: "#fff", borderColor: "var(--danger)" }}
              disabled={confirmText !== "确认覆盖"}
              onClick={() => onChoose("overwrite")}
            >
              覆盖
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>导入配置</h2>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>
        <p style={{ margin: "8px 0 16px", lineHeight: 1.6 }}>
          检测到 {data.lists.length} 个题单，{data.attempts.length} 条刷题记录。选择导入方式：
        </p>
        <div className="import-choice-buttons">
          <button onClick={() => onChoose("merge")}>
            合并到现有数据
          </button>
          <button onClick={() => setStep("confirm")}>
            覆盖当前配置
          </button>
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}
