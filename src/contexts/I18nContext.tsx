import { createContext, useContext } from "react"
import type { ReactNode } from "react"
import type { TFunc } from "../lib/types"

const I18nContext = createContext<TFunc | null>(null)

export function I18nProvider({ t, children }: { t: TFunc; children: ReactNode }) {
  return <I18nContext.Provider value={t}>{children}</I18nContext.Provider>
}

export function useT(): TFunc {
  const t = useContext(I18nContext)
  if (!t) throw new Error("useT must be used within I18nProvider")
  return t
}
