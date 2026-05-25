import { createContext, useContext } from "react"
import type { ReactNode } from "react"
import type { PushToast } from "../hooks/types"

const ToastContext = createContext<PushToast | null>(null)

export function ToastProvider({
  pushToast,
  children,
}: {
  pushToast: PushToast
  children: ReactNode
}) {
  return <ToastContext.Provider value={pushToast}>{children}</ToastContext.Provider>
}

export function usePushToast(): PushToast {
  const pushToast = useContext(ToastContext)
  if (!pushToast) throw new Error("usePushToast must be used within ToastProvider")
  return pushToast
}
