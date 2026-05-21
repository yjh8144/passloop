import { createContext, useContext, useMemo } from "react"
import type { ReactNode } from "react"
import type { ShowConfirm } from "../hooks/types"

export type ShowPrompt = (title: string, defaultValue: string, onSubmit: (value: string) => void) => void

interface DialogContextValue {
  showConfirm: ShowConfirm
  showPrompt: ShowPrompt
}

const DialogContext = createContext<DialogContextValue | null>(null)

export function DialogProvider({
  showConfirm,
  showPrompt,
  children,
}: DialogContextValue & { children: ReactNode }) {
  const value = useMemo(() => ({ showConfirm, showPrompt }), [showConfirm, showPrompt])
  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error("useDialog must be used within DialogProvider")
  return ctx
}
