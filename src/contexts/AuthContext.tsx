import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getAuthRepository } from '@/repositories'
import type { User } from '@/types/models'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  recoveryMode: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  logout: () => Promise<void>
  clearRecoveryMode: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const auth = getAuthRepository()

  useEffect(() => {
    let active = true

    auth
      .getSession()
      .then((session) => {
        if (active) setUser(session)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    const unsubscribe = auth.onAuthStateChange((next, event) => {
      setUser(next)
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [auth])

  const login = useCallback(
    async (email: string, password: string) => {
      const next = await auth.login(email, password)
      setUser(next)
      setRecoveryMode(false)
    },
    [auth],
  )

  const loginWithGoogle = useCallback(async () => {
    await auth.loginWithGoogle()
  }, [auth])

  const resetPassword = useCallback(
    async (email: string) => {
      await auth.resetPassword(email)
    },
    [auth],
  )

  const updatePassword = useCallback(
    async (password: string) => {
      await auth.updatePassword(password)
      setRecoveryMode(false)
    },
    [auth],
  )

  const logout = useCallback(async () => {
    await auth.logout()
    setUser(null)
    setRecoveryMode(false)
  }, [auth])

  const clearRecoveryMode = useCallback(() => {
    setRecoveryMode(false)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      recoveryMode,
      login,
      loginWithGoogle,
      resetPassword,
      updatePassword,
      logout,
      clearRecoveryMode,
    }),
    [
      user,
      isLoading,
      recoveryMode,
      login,
      loginWithGoogle,
      resetPassword,
      updatePassword,
      logout,
      clearRecoveryMode,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext debe usarse dentro de AuthProvider')
  return ctx
}
