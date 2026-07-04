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
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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

    const unsubscribe = auth.onAuthStateChange((next) => {
      setUser(next)
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
    },
    [auth],
  )

  const logout = useCallback(async () => {
    await auth.logout()
    setUser(null)
  }, [auth])

  const value = useMemo(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext debe usarse dentro de AuthProvider')
  return ctx
}
