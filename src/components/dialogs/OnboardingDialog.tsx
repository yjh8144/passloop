import { Github, X } from "lucide-react";

export function OnboardingDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>欢迎使用 PassLoop</h2>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ lineHeight: 1.8, fontSize: "0.95rem" }}>
          <p style={{ marginBottom: 12 }}>PassLoop 是一个纯前端的刷题系统，所有数据保存在浏览器缓存中。以下是快速上手指南：</p>
          <ol style={{ paddingLeft: 20, margin: "0 0 12px" }}>
            <li><strong>选择或新建题单</strong> — 左侧边栏的「题单」列表可切换不同题单，点击 <strong>+</strong> 按钮可新建题单。</li>
            <li><strong>导入题目</strong> — 点击左侧「导入题目」上传 JSON 文件，或在「题库管理」页面手动添加题目。</li>
            <li><strong>LLM 解析</strong> — 粘贴未整理的题目文本，配置 LLM 后一键转换为标准题库格式。</li>
            <li><strong>刷题练习</strong> — 在「刷题台」中答题，系统会记录正确率、用时和错题。右上角有设置按钮，可切换排序、模式等选项。</li>
            <li><strong>错题重练</strong> — 点击「错题临时页」可集中练习做错的题目。</li>
          </ol>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
            提示：数据存储在浏览器本地，清除浏览器缓存会丢失数据。建议定期使用「导出配置」备份。
          </p>
          <p style={{ marginTop: 12, fontSize: "0.9rem" }}>
            <a
              href="https://github.com/yjh8144/passloop"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--accent)" }}
            >
              <Github size={16} /> GitHub 仓库
            </a>
            {" "}— 欢迎 Star 与反馈问题。
          </p>
        </div>
        <div className="modal-actions">
          <button
            className="primary-button"
            style={{ marginLeft: "auto" }}
            onClick={onClose}
          >
            开始使用
          </button>
        </div>
      </div>
    </div>
  );
}
