import type { Toast } from "../../lib/types";

export function ToastStack(props: { toasts: Toast[] }) {
  return (
    <div className="toast-stack">
      {props.toasts.map((toast) => {
        const level = Math.min((toast.repeatCount ?? 1) - 1, 4);
        return (
          <div
            className={`toast ${toast.tone} ${toast.bump ? "bump" : ""} ${level > 0 ? `toast-level-${level}` : ""}`}
            key={toast.id + (toast.bump ?? "")}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}
