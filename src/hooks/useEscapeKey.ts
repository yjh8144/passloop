import { useEffect } from "react"

/**
 * Calls `onEscape` when the Escape key is pressed while `active` is true.
 * Shared by modal dialogs so closing with Esc behaves consistently.
 */
export function useEscapeKey(onEscape: () => void, active = true) {
  useEffect(() => {
    if (!active) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEscape()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onEscape, active])
}
