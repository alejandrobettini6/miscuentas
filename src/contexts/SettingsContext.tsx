import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getSettingsRepository } from '@/repositories'
import type { Settings, UpdateSettingsInput } from '@/types/models'
import { useAuthContext } from './AuthContext'

interface SettingsContextValue {
  settings: Settings | null
  isLoading: boolean
  updateSettings: (input: UpdateSettingsInput) => Promise<Settings>
  refresh: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const repo = getSettingsRepository()

  const refresh = useCallback(async () => {
    if (!user) {
      setSettings(null)
      return
    }
    setIsLoading(true)
    try {
      const next = await repo.get(user.id)
      setSettings(next)
    } finally {
      setIsLoading(false)
    }
  }, [repo, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const updateSettings = useCallback(
    async (input: UpdateSettingsInput) => {
      if (!user) throw new Error('No autenticado')
      const next = await repo.update(user.id, input)
      setSettings(next)
      return next
    },
    [repo, user],
  )

  const value = useMemo(
    () => ({ settings, isLoading, updateSettings, refresh }),
    [settings, isLoading, updateSettings, refresh],
  )

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  )
}

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettingsContext debe usarse dentro de SettingsProvider')
  return ctx
}
