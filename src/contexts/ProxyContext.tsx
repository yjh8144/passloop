import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { ReactNode } from "react"
import type { ProxySettings } from "../lib/types"
import { loadProxySettings, saveProxySettings, PROXY_STORAGE_KEY } from "../lib/storage"
import { defaultProxySettings } from "../utils/constants"
import { debugLog } from "../lib/debug"
import { safeRemoveStorageItem } from "../utils/safeStorage"

const ProxyConfigModal = lazy(() =>
  import("../components/proxy/ProxyConfigModal").then((module) => ({
    default: module.ProxyConfigModal,
  })),
)

interface ProxyContextValue {
  proxySettings: ProxySettings
  updateProxySettings: (patch: Partial<ProxySettings>) => void
  resetProxySettings: () => void
  openProxyConfig: () => void
  closeProxyConfig: () => void
}

const ProxyContext = createContext<ProxyContextValue | null>(null)

export function ProxyProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ProxySettings>(() =>
    loadProxySettings(defaultProxySettings),
  )
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    saveProxySettings(settings)
  }, [settings])

  const updateProxySettings = useCallback((patch: Partial<ProxySettings>) => {
    debugLog("[ProxyContext] updateProxySettings", patch)
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const resetProxySettings = useCallback(() => {
    debugLog("[ProxyContext] resetProxySettings")
    safeRemoveStorageItem("local", PROXY_STORAGE_KEY)
    setSettings(defaultProxySettings)
  }, [])

  const openProxyConfig = useCallback(() => setShowModal(true), [])
  const closeProxyConfig = useCallback(() => setShowModal(false), [])

  const value = useMemo<ProxyContextValue>(
    () => ({
      proxySettings: settings,
      updateProxySettings,
      resetProxySettings,
      openProxyConfig,
      closeProxyConfig,
    }),
    [settings, updateProxySettings, resetProxySettings, openProxyConfig, closeProxyConfig],
  )

  return (
    <ProxyContext.Provider value={value}>
      {children}
      {showModal && (
        <Suspense fallback={null}>
          <ProxyConfigModal
            open={showModal}
            onClose={closeProxyConfig}
            proxySettings={settings}
            updateProxySettings={updateProxySettings}
          />
        </Suspense>
      )}
    </ProxyContext.Provider>
  )
}

export function useProxy(): ProxyContextValue {
  const ctx = useContext(ProxyContext)
  if (!ctx) throw new Error("useProxy must be used within ProxyProvider")
  return ctx
}
