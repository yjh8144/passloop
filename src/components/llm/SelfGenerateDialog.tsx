import { useState } from "react"
import { Check, Copy, Download, X } from "lucide-react"
import { Segmented } from "../ui/Segmented"
import { useT } from "../../contexts"

export function SelfGenerateDialog(props: {
  open: boolean
  mode: "answer" | "explanation" | "both" | "none"
  setMode: (mode: "answer" | "explanation" | "both" | "none") => void
  rawText?: string
  onClose: () => void
}) {
  const t = useT()
  const [copied, setCopied] = useState(false)

  if (!props.open) return null

  const fillInstruction =
    props.mode === "answer"
      ? "请为每道题补充答案。"
      : props.mode === "explanation"
        ? "请为每道题补充解析。"
        : props.mode === "none"
          ? "不需要补充答案和解析，answer 和 explanation 留空即可。"
          : "请为每道题同时补充答案和解析。"

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
}`

  const rawTextSection = props.rawText?.trim() ? `\n\n原始题目：\n${props.rawText.trim()}` : ""

  const prompt = `你是题库整理助手。请把我提供的题目转换为以下 JSON 格式。${fillInstruction}
只返回 JSON，不要使用 Markdown 代码块包裹。

type 可选值：single（单选）、multiple（多选）、boolean（判断）、blank（填空）、short（简答）、composite（综合题）。
options 格式：[{"label":"A","text":"选项内容"}]，判断题用 [{"label":"T","text":"正确"},{"label":"F","text":"错误"}]。
多选题/填空题 answer 用数组，如 ["A","B"]。判断题 answer 用 "T" 或 "F"。

输出 JSON 格式：
${jsonFormat}${rawTextSection}`

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownload = () => {
    const blob = new Blob([prompt], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "passloop-prompt.txt"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const hasRawText = !!props.rawText?.trim()

  return (
    <div className="modal-overlay" onClick={props.onClose}>
      <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("selfGenerateHeader")}</h2>
          <button className="icon-button" onClick={props.onClose}>
            <X size={18} />
          </button>
        </div>
        <p className="modal-desc">
          {hasRawText ? t("selfGenerateDescWithRawText") : t("selfGenerateDescNoRaw")}
        </p>
        <div className="self-gen-options">
          <span>{t("selfGenerateContentLabel")}</span>
          <Segmented
            value={props.mode}
            options={[
              ["both", t("answerExplanationQuestionsOpt")],
              ["answer", t("answerQuestionsOpt")],
              ["explanation", t("explanationQuestionsOpt")],
              ["none", t("onlyQuestionsOpt")],
            ]}
            onChange={(v) => props.setMode(v as "answer" | "explanation" | "both" | "none")}
          />
        </div>
        <div className="self-gen-prompt-box">
          <div className="self-gen-prompt-header">
            <strong>
              {hasRawText
                ? t("promptWithRawInfo", prompt.length.toLocaleString())
                : t("promptCharCount", prompt.length.toLocaleString())}
            </strong>
            <div className="self-gen-prompt-actions">
              <button onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check size={15} /> {t("copied")}
                  </>
                ) : (
                  <>
                    <Copy size={15} /> {t("copy")}
                  </>
                )}
              </button>
              <button onClick={handleDownload}>
                <Download size={15} /> {t("downloadTxt")}
              </button>
            </div>
          </div>
          {prompt.length > 10000 && (
            <p className="prompt-length-warning">{t("longTextWarningText")}</p>
          )}
          <pre className="self-gen-prompt-text">{prompt}</pre>
        </div>
        <div className="self-gen-tip">
          <strong>{t("usageStepsTitle")}</strong>
          <ol>
            <li>{hasRawText ? t("stepCopyPrompt") : t("stepCopyPromptWithText")}</li>
            <li>{t("stepPasteToAi")}</li>
            <li>{t("stepPasteJson")}</li>
            <li>{t("stepValidateAndSave")}</li>
          </ol>
        </div>
        <div className="modal-actions">
          <button onClick={props.onClose}>{t("closeBtn")}</button>
        </div>
      </div>
    </div>
  )
}
