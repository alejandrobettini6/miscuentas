import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { STORAGE_KEYS } from '@/constants/storage'
import { readJson, writeJson } from '@/lib/localStorage'

export type ThemePreference = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  /** Preferencia elegida por el usuario. */
  theme: ThemePreference
  /** Tema efectivo aplicado (resuelve 'system'). */
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#f5f5f7',
  dark: '#000000',
}

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  )
}

function resolve(theme: ThemePreference): ResolvedTheme {
  if (theme === 'system') return prefersDark() ? 'dark' : 'light'
  return theme
}

function applyResolvedTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement
  root.dataset.theme = resolved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLORS[resolved])
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() =>
    readJson<ThemePreference>(STORAGE_KEYS.THEME, 'system'),
  )
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolve(theme),
  )

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next)
    writeJson(STORAGE_KEYS.THEME, next)
    const resolved = resolve(next)
    setResolvedTheme(resolved)
    applyResolvedTheme(resolved)
  }, [])

  // Reacciona a cambios del sistema cuando la preferencia es 'system'.
  useEffect(() => {
    applyResolvedTheme(resolvedTheme)
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const resolved = media.matches ? 'dark' : 'light'
      setResolvedTheme(resolved)
      applyResolvedTheme(resolved)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme, resolvedTheme])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return ctx
}
