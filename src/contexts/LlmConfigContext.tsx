import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import type {
  LlmConfig,
  LlmMultiConfig,
  LlmProvider,
  LlmScenario,
  LlmScenarioAssignment,
} from "../lib/types"
import { loadLlmMultiConfig, saveLlmMultiConfig, clearLlmMultiConfig } from "../lib/storage"
import { defaultLlmMultiConfig } from "../utils/constants"
import { createId } from "../lib/question"
import { LlmConfigModal } from "../components/llm/LlmConfigModal"

interface LlmConfigContextValue {
  providers: LlmProvider[]
  addProvider: (data: Omit<LlmProvider, "id" | "createdAt" | "updatedAt">) => LlmProvider
  updateProvider: (id: string, patch: Partial<LlmProvider>) => void
  deleteProvider: (id: string) => void

  assignments: LlmScenarioAssignment
  assignProvider: (scenario: LlmScenario, providerId: string | null) => void

  getConfigForScenario: (scenario: LlmScenario) => LlmConfig | null
  resolveProvider: (id: string) => LlmConfig | null

  openLlmConfig: () => void
  closeLlmConfig: () => void
  clearLlmConfig: () => void
}

const LlmConfigContext = createContext<LlmConfigContextValue | null>(null)

export function LlmConfigProvider({ children }: { children: ReactNode }) {
  const [multiConfig, setMultiConfig] = useState<LlmMultiConfig>(() =>
    loadLlmMultiConfig(defaultLlmMultiConfig),
  )
  const [showModal, setShowModal] = useState(false)

  useEffect(() => saveLlmMultiConfig(multiConfig), [multiConfig])

  const addProvider = useCallback(
    (data: Omit<LlmProvider, "id" | "createdAt" | "updatedAt">): LlmProvider => {
      const timestamp = new Date().toISOString()
      const provider: LlmProvider = {
        ...data,
        id: createId(),
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      setMultiConfig((prev) => {
        const next = { ...prev, providers: [...prev.providers, provider] }
        if (!prev.assignments.parse) next.assignments = { ...next.assignments, parse: provider.id }
        if (!prev.assignments.fill) next.assignments = { ...next.assignments, fill: provider.id }
        return next
      })
      return provider
    },
    [],
  )

  const updateProvider = useCallback((id: string, patch: Partial<LlmProvider>) => {
    setMultiConfig((prev) => ({
      ...prev,
      providers: prev.providers.map((p) =>
        p.id === id ? { ...p, ...patch, id, updatedAt: new Date().toISOString() } : p,
      ),
    }))
  }, [])

  const deleteProvider = useCallback((id: string) => {
    setMultiConfig((prev) => ({
      ...prev,
      providers: prev.providers.filter((p) => p.id !== id),
      assignments: {
        parse: prev.assignments.parse === id ? null : prev.assignments.parse,
        fill: prev.assignments.fill === id ? null : prev.assignments.fill,
      },
    }))
  }, [])

  const assignProvider = useCallback((scenario: LlmScenario, providerId: string | null) => {
    setMultiConfig((prev) => ({
      ...prev,
      assignments: { ...prev.assignments, [scenario]: providerId },
    }))
  }, [])

  const resolveProvider = useCallback(
    (id: string): LlmConfig | null => {
      const p = multiConfig.providers.find((pv) => pv.id === id)
      if (!p) return null
      return {
        provider: p.provider,
        endpoint: p.endpoint,
        apiKey: p.apiKey,
        model: p.model,
        fillAnswer: true,
        fillExplanation: true,
        proxyEnabled: false,
        proxyUrl: "",
        proxyKey: "",
      }
    },
    [multiConfig],
  )

  const getConfigForScenario = useCallback(
    (scenario: LlmScenario): LlmConfig | null => {
      const id = multiConfig.assignments[scenario]
      if (!id) return null
      return resolveProvider(id)
    },
    [multiConfig, resolveProvider],
  )

  const openLlmConfig = useCallback(() => setShowModal(true), [])
  const closeLlmConfig = useCallback(() => setShowModal(false), [])
  const clearConfig = useCallback(() => {
    clearLlmMultiConfig()
    setMultiConfig(defaultLlmMultiConfig)
  }, [])

  const value = useMemo<LlmConfigContextValue>(
    () => ({
      providers: multiConfig.providers,
      addProvider,
      updateProvider,
      deleteProvider,
      assignments: multiConfig.assignments,
      assignProvider,
      getConfigForScenario,
      resolveProvider,
      openLlmConfig,
      closeLlmConfig,
      clearLlmConfig: clearConfig,
    }),
    [
      multiConfig,
      addProvider,
      updateProvider,
      deleteProvider,
      assignProvider,
      getConfigForScenario,
      resolveProvider,
      openLlmConfig,
      closeLlmConfig,
      clearConfig,
    ],
  )

  return (
    <LlmConfigContext.Provider value={value}>
      {children}
      <LlmConfigModal open={showModal} onClose={closeLlmConfig} />
    </LlmConfigContext.Provider>
  )
}

export function useLlmConfig(): LlmConfigContextValue {
  const ctx = useContext(LlmConfigContext)
  if (!ctx) throw new Error("useLlmConfig must be used within LlmConfigProvider")
  return ctx
}
