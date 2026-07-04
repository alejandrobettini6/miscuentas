import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuthContext } from '@/contexts/AuthContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { HomePage } from '@/pages/Home/HomePage'
import { LoginPage } from '@/pages/Login/LoginPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

function AppRoutes() {
  const { user, isLoading } = useAuthContext()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[var(--muted)]">
        Cargando…
      </div>
    )
  }

  return user ? <HomePage /> : <LoginPage />
}

export default function App() {
  return (
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
  )
}
