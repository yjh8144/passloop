import type { Dispatch, SetStateAction } from "react"
import type { AppData, QuestionList, Toast } from "../lib/types"

export type Page = "practice" | "manager" | "llm" | "settings"
export type AnswerMap = Record<string, string | string[]>
export type ResultMap = Record<string, boolean>

export type PushToast = (tone: Toast["tone"], message: string) => void
export type ShowConfirm = (
  message: string,
  onConfirm: (dontAskAgain: boolean) => void,
  options?: {
    dismissLabel?: string
    tone?: "danger" | "normal"
    onCancel?: () => void
    cancelLabel?: string
    confirmLabel?: string
  },
) => void
export type UpdateData = (recipe: (draft: AppData) => AppData) => void
export type UpdateActiveList = (recipe: (list: QuestionList) => QuestionList) => void
export type SetState<T> = Dispatch<SetStateAction<T>>

export type ImportCommitMode = "current" | "new" | { listId: string }
