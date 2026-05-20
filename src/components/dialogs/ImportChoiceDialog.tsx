import { X } from "lucide-react";
import type { QuestionList } from "../../lib/types";

export function ImportChoiceDialog({ lists, activeListName, onClose, onChoose }: {
  lists: QuestionList[] | null;
  activeListName: string;
  onClose: () => void;
  onChoose: (mode: "current" | "new") => void;
}) {
  if (!lists) return null;
  const totalQuestions = lists.reduce((sum, l) => sum + l.questions.length, 0);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>导入题目</h2>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>
        <p style={{ margin: "8px 0 16px", lineHeight: 1.6 }}>
          共 {totalQuestions} 道题，要添加到哪里？
        </p>
        <div className="import-choice-buttons">
          <button onClick={() => onChoose("current")}>
            添加到当前题单「{activeListName}」
          </button>
          <button onClick={() => onChoose("new")}>
            创建新题单
          </button>
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}
