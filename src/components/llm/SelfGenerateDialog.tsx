import { useState } from "react";
import { Check, Copy, Download, X } from "lucide-react";
import { Segmented } from "../ui/Segmented";

export function SelfGenerateDialog(props: {
  open: boolean;
  mode: "answer" | "explanation" | "both" | "none";
  setMode: (mode: "answer" | "explanation" | "both" | "none") => void;
  rawText?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!props.open) return null;

  const fillInstruction = props.mode === "answer"
    ? "请为每道题补充答案。"
    : props.mode === "explanation"
      ? "请为每道题补充解析。"
      : props.mode === "none"
        ? "不需要补充答案和解析，answer 和 explanation 留空即可。"
        : "请为每道题同时补充答案和解析。";

  const jsonFormat = `{
  "name": "题单名称",
  "description": "",
  "questions": [
    {
      "type": "single|multiple|boolean|blank|short|composite",
      "title": "题目标题",
      "prompt": "题干内容",
      "options": [{"label": "A", "text": "选项内容"}],
      "answer": ${props.mode === "explanation" || props.mode === "none" ? '""' : '"A"'},
      "explanation": ${props.mode === "answer" || props.mode === "none" ? '""' : '"详细解析内容"'},
      "hint": "",
      "subQuestions": []
    }
  ]
}`;

  const rawTextSection = props.rawText?.trim()
    ? `\n\n原始题目：\n${props.rawText.trim()}`
    : "";

  const prompt = `你是题库整理助手。请把我提供的题目转换为以下 JSON 格式。${fillInstruction}
只返回 JSON，不要使用 Markdown 代码块包裹。

type 可选值：single（单选）、multiple（多选）、boolean（判断）、blank（填空）、short（简答）、composite（综合题）。
options 格式：[{"label":"A","text":"选项内容"}]，判断题用 [{"label":"T","text":"正确"},{"label":"F","text":"错误"}]。
多选题/填空题 answer 用数组，如 ["A","B"]。判断题 answer 用 "T" 或 "F"。

输出 JSON 格式：
${jsonFormat}${rawTextSection}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([prompt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "passloop-prompt.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const hasRawText = !!props.rawText?.trim();

  return (
    <div className="modal-overlay" onClick={props.onClose}>
      <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>自助 AI 生成题目 JSON</h2>
          <button className="icon-button" onClick={props.onClose}><X size={18} /></button>
        </div>
        <p className="modal-desc">
          {hasRawText
            ? "Prompt 已包含你输入的题目文本。复制或下载后直接发给你的 AI，将返回的 JSON 粘贴到右侧解析结果区域。"
            : "选择生成内容，复制下方 Prompt 发送给你的 AI（ChatGPT、Claude、Gemini 等），将题目文本一并发送，然后把生成的 JSON 粘贴到解析结果区域导入。"}
        </p>
        <div className="self-gen-options">
          <span>生成内容：</span>
          <Segmented
            value={props.mode}
            options={[
              ["both", "答案 + 解析 + 题目"],
              ["answer", "答案 + 题目"],
              ["explanation", "解析 + 题目"],
              ["none", "仅题目"],
            ]}
            onChange={(v) => props.setMode(v as "answer" | "explanation" | "both" | "none")}
          />
        </div>
        <div className="self-gen-prompt-box">
          <div className="self-gen-prompt-header">
            <strong>Prompt{hasRawText ? `（已包含题目文本，${prompt.length.toLocaleString()} 字）` : `（${prompt.length.toLocaleString()} 字）`}</strong>
            <div className="self-gen-prompt-actions">
              <button onClick={handleCopy}>
                {copied ? <><Check size={15} /> 已复制</> : <><Copy size={15} /> 复制</>}
              </button>
              <button onClick={handleDownload}>
                <Download size={15} /> 下载 TXT
              </button>
            </div>
          </div>
          {prompt.length > 10000 && (
            <p className="prompt-length-warning">内容较长（超过 1 万字），建议下载 TXT 文件后以附件形式发送给 AI。</p>
          )}
          <pre className="self-gen-prompt-text">{prompt}</pre>
        </div>
        <div className="self-gen-tip">
          <strong>使用步骤：</strong>
          <ol>
            <li>复制或下载上方 Prompt{!hasRawText && "，并附上需要整理的题目文本"}</li>
            <li>在你的 AI 对话中粘贴完整 Prompt</li>
            <li>AI 返回 JSON 后，将 JSON 粘贴到右侧解析结果区域</li>
            <li>点击「校验并保存」后即可导入题单</li>
          </ol>
        </div>
        <div className="modal-actions">
          <button onClick={props.onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
