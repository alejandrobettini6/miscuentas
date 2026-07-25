import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuthContext } from '@/contexts/AuthContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { HomePage } from '@/pages/Home/HomePage'
import { LoginPage } from '@/pages/Login/LoginPage'
import { UpdatePasswordPage } from '@/pages/Login/UpdatePasswordPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Datos propios del usuario: evitamos refetch/re-render innecesarios.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function AppRoutes() {
  const { user, isLoading, recoveryMode } = useAuthContext()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[var(--muted)]">
        Cargando…
      </div>
    )
  }

  if (recoveryMode) {
    return <UpdatePasswordPage />
  }

  return user ? <HomePage /> : <LoginPage />
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SettingsProvider>
            <AppRoutes />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 2000,
                success: {
                  style: {
                    background: '#34c759',
                    color: '#fff',
                  },
                },
                error: {
                  style: {
                    background: '#ff3b30',
                    color: '#fff',
                  },
                },
              }}
            />
          </SettingsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
