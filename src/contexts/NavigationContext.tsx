import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import type { MutableRefObject, ReactNode } from "react"
import type { Page } from "../hooks/types"
import { debugLog } from "../lib/debug"
import { useDialog } from "./DialogContext"
import { useT } from "./I18nContext"

interface NavigationContextValue {
  page: Page
  setPage: React.Dispatch<React.SetStateAction<Page>>
  changePage: (next: Page) => void
  mobileSidebarCollapsed: boolean
  setMobileSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  desktopSidebarCollapsed: boolean
  setDesktopSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  llmUnsavedRef: MutableRefObject<boolean>
  registerWrongStart: (fn: () => void) => void
}

const NavigationContext = createContext<NavigationContextValue | null>(null)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const t = useT()
  const { showConfirm } = useDialog()
  const [page, setPage] = useState<Page>("practice")
  const [mobileSidebarCollapsed, setMobileSidebarCollapsed] = useState(false)
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false)
  const llmUnsavedRef = useRef(false)
  const wrongStartRef = useRef<(() => void) | null>(null)

  const registerWrongStart = useCallback((fn: () => void) => {
    wrongStartRef.current = fn
  }, [])

  const changePage = useCallback(
    (nextPage: Page) => {
      debugLog("Page changed", { to: nextPage })
      if (page === "llm" && nextPage !== "llm" && llmUnsavedRef.current) {
        showConfirm(t("confirmLeaveLlm"), () => {
          llmUnsavedRef.current = false
          if (nextPage === "wrong") {
            wrongStartRef.current?.()
          } else {
            setPage(nextPage)
          }
        })
        return
      }
      if (nextPage === "wrong") {
        wrongStartRef.current?.()
        return
      }
      setPage(nextPage)
    },
    [page, showConfirm, t],
  )

  const value = useMemo(
    () => ({
      page,
      setPage,
      changePage,
      mobileSidebarCollapsed,
      setMobileSidebarCollapsed,
      desktopSidebarCollapsed,
      setDesktopSidebarCollapsed,
      llmUnsavedRef,
      registerWrongStart,
    }),
    [page, changePage, mobileSidebarCollapsed, desktopSidebarCollapsed, registerWrongStart],
  )

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext)
  if (!ctx) throw new Error("useNavigation must be used within NavigationProvider")
  return ctx
}
