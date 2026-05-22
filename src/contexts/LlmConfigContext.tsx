import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { LlmConfig } from "../lib/types"
import { loadLlmConfig, saveLlmConfig, clearLlmConfig } from "../lib/storage"
import { defaultLlmConfig } from "../utils/constants"
import { LlmConfigModal } from "../components/llm/LlmConfigModal"

interface LlmConfigContextValue {
  llmConfig: LlmConfig
  setLlmConfig: (config: LlmConfig) => void
  openLlmConfig: () => void
  closeLlmConfig: () => void
  clearLlmConfig: () => void
}

const LlmConfigContext = createContext<LlmConfigContextValue | null>(null)

export function LlmConfigProvider({ children }: { children: ReactNode }) {
  const [llmConfig, setLlmConfig] = useState<LlmConfig>(() => loadLlmConfig(defaultLlmConfig))
  const [showModal, setShowModal] = useState(false)

  useEffect(() => saveLlmConfig(llmConfig), [llmConfig])

  const openLlmConfig = useCallback(() => setShowModal(true), [])
  const closeLlmConfig = useCallback(() => setShowModal(false), [])
  const clearConfig = useCallback(() => {
    clearLlmConfig()
    setLlmConfig(defaultLlmConfig)
  }, [])

  return (
    <LlmConfigContext.Provider
      value={{ llmConfig, setLlmConfig, openLlmConfig, closeLlmConfig, clearLlmConfig: clearConfig }}
    >
      {children}
      <LlmConfigModal
        open={showModal}
        onClose={closeLlmConfig}
        config={llmConfig}
        setConfig={setLlmConfig}
      />
    </LlmConfigContext.Provider>
  )
}

export function useLlmConfig(): LlmConfigContextValue {
  const ctx = useContext(LlmConfigContext)
  if (!ctx) throw new Error("useLlmConfig must be used within LlmConfigProvider")
  return ctx
}
