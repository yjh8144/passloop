import { Component, type ReactNode, type ErrorInfo } from "react"
import { debugError } from "../lib/debug"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  componentStack: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, componentStack: "" }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    debugError("ErrorBoundary caught", error, info.componentStack)
    this.setState({ componentStack: info.componentStack ?? "" })
  }

  private getFullErrorText(): string {
    const { error, componentStack } = this.state
    const parts: string[] = []
    if (error) {
      parts.push(`${error.name}: ${error.message}`)
      if (error.stack) {
        const stackLines = error.stack.replace(`${error.name}: ${error.message}`, "").trim()
        if (stackLines) parts.push(stackLines)
      }
    }
    if (componentStack) {
      parts.push("\nComponent Stack:" + componentStack)
    }
    return parts.join("\n")
  }

  private buildIssueUrl(): string {
    const error = this.state.error
    const fullText = this.getFullErrorText()
    const title = `[Bug] App crash: ${error?.message?.slice(0, 80) ?? "Unknown error"}`
    const body = [
      `## 错误信息 / Error`,
      "```",
      fullText || "Unknown",
      "```",
      "",
      `## 环境 / Environment`,
      `- Browser: ${navigator.userAgent}`,
      `- URL: ${location.href}`,
      `- Time: ${new Date().toISOString()}`,
      `- Version: ${document.querySelector("meta[name=version]")?.getAttribute("content") ?? "unknown"}`,
      "",
      `## 复现步骤 / Steps to Reproduce`,
      `1. (出错前你在做什么？/ What were you doing before the crash?)`,
      `2. `,
      `3. `,
      "",
      `## 期望行为 / Expected Behavior`,
      `(应该发生什么？/ What should have happened?)`,
      "",
      `## 补充信息 / Additional Context`,
      `(截图、控制台报错等 / Screenshots, console errors, etc.)`,
    ].join("\n")

    const url = `https://github.com/yjh8144/passloop/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
    if (url.length > 8000) {
      const shortBody = [
        `## 错误信息 / Error`,
        "```",
        `${error?.name}: ${error?.message}`,
        (error?.stack ?? "").split("\n").slice(1, 8).join("\n"),
        "```",
        "",
        `## 环境 / Environment`,
        `- Browser: ${navigator.userAgent}`,
        `- URL: ${location.href}`,
        `- Time: ${new Date().toISOString()}`,
        "",
        `_(完整错误栈请从崩溃页面复制 / Copy full stack from crash page)_`,
      ].join("\n")
      return `https://github.com/yjh8144/passloop/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(shortBody)}`
    }
    return url
  }

  private handleCopyError = () => {
    const text = this.getFullErrorText()
    navigator.clipboard.writeText(text).catch(() => {})
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const fullError = this.getFullErrorText()

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--surface, #f8f8f8)",
          padding: 24,
        }}
      >
        <div
          style={{
            background: "var(--card, #fff)",
            border: "1px solid var(--border, #e0e0e0)",
            borderRadius: 12,
            padding: 32,
            maxWidth: 600,
            width: "100%",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ margin: "0 0 12px", fontSize: 20, textAlign: "center" }}>
            出错了 / Something went wrong
          </h2>
          <p style={{ color: "var(--muted, #666)", fontSize: 14, margin: "0 0 16px", textAlign: "center" }}>
            应用遇到了意外错误，请尝试重新加载页面。
            <br />
            The app encountered an unexpected error. Please try reloading.
          </p>
          {fullError && (
            <pre
              style={{
                background: "var(--surface-2, #f0f0f0)",
                padding: 12,
                borderRadius: 8,
                fontSize: 11,
                lineHeight: 1.5,
                textAlign: "left",
                overflow: "auto",
                maxHeight: 240,
                margin: "0 0 16px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                border: "1px solid var(--border, #e0e0e0)",
              }}
            >
              {fullError}
            </pre>
          )}
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => location.reload()}
              style={{
                background: "var(--accent, #4f8cff)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              重新加载 / Reload
            </button>
            <button
              onClick={this.handleCopyError}
              style={{
                background: "var(--surface-2, #f0f0f0)",
                color: "var(--text, #333)",
                border: "1px solid var(--border, #e0e0e0)",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              复制错误 / Copy Error
            </button>
            <a
              href={this.buildIssueUrl()}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "var(--surface-2, #f0f0f0)",
                color: "var(--text, #333)",
                border: "1px solid var(--border, #e0e0e0)",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              报告问题 / Report Issue
            </a>
          </div>
        </div>
      </div>
    )
  }
}
