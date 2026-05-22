import { createContext, useCallback, useContext, useState } from "react"
import type { ReactNode } from "react"
import type { ShowConfirm } from "../hooks/types"
import {
  ConfirmDialog,
  PromptDialog,
} from "../components/dialogs/ConfirmDialog"
import type {
  ConfirmDialogState,
  PromptDialogState,
} from "../components/dialogs/ConfirmDialog"

export type ShowPrompt = (title: string, defaultValue: string, onSubmit: (value: string) => void) => void

interface DialogContextValue {
  showConfirm: ShowConfirm
  showPrompt: ShowPrompt
}

const DialogContext = createContext<DialogContextValue | null>(null)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null)
  const [promptDialog, setPromptDialog] = useState<PromptDialogState>(null)

  const showConfirm = useCallback((message: string, onConfirm: () => void) => {
    setConfirmDialog({ message, onConfirm })
  }, [])

  const showPrompt = useCallback(
    (title: string, defaultValue: string, onSubmit: (value: string) => void) => {
      setPromptDialog({ title, defaultValue, onSubmit })
    },
    [],
  )

  return (
    <DialogContext.Provider value={{ showConfirm, showPrompt }}>
      {children}
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(null)} />
      <PromptDialog state={promptDialog} onClose={() => setPromptDialog(null)} />
    </DialogContext.Provider>
  )
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error("useDialog must be used within DialogProvider")
  return ctx
}
