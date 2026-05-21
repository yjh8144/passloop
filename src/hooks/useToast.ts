import { useCallback, useRef, useState } from "react"
import type { Toast } from "../lib/types"
import { createId } from "../lib/question"

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timerMap = useRef(new Map<string, number>())

  const pushToast = useCallback((tone: Toast["tone"], message: string) => {
    setToasts((items) => {
      const last = items[items.length - 1]
      if (last && last.message === message) {
        const targetId = last.id
        const prev = timerMap.current.get(targetId)
        if (prev != null) window.clearTimeout(prev)
        const handle = window.setTimeout(() => {
          setToasts((current) => current.filter((item) => item.id !== targetId))
          timerMap.current.delete(targetId)
        }, 3200)
        timerMap.current.set(targetId, handle)
        return items.map((item) =>
          item.id === targetId
            ? { ...item, bump: Date.now(), repeatCount: Math.min((item.repeatCount ?? 1) + 1, 5) }
            : item,
        )
      }
      const id = createId()
      const handle = window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id))
        timerMap.current.delete(id)
      }, 3200)
      timerMap.current.set(id, handle)
      return [...items, { id, tone, message, repeatCount: 1 }]
    })
  }, [])

  return { toasts, pushToast }
}
