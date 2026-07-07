import { useEffect, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { GoogleSignInButton } from '@/components/ui/GoogleSignInButton'
import { Input } from '@/components/ui/Input'
import { useAuthContext } from '@/contexts/AuthContext'
import { getDataMode } from '@/config/env'
import { getErrorMessage } from '@/utils/errors'

export function LoginPage() {
  const { login, loginWithGoogle, resetPassword } = useAuthContext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const isLocal = getDataMode() === 'local'
  const isSupabase = getDataMode() === 'supabase'

  useEffect(() => {
    const resetGoogleLoading = () => setIsGoogleLoading(false)
    resetGoogleLoading()

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resetGoogleLoading()
    }

    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await login(email, password)
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo iniciar sesión'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault()
    if (isResetting) return
    setIsResetting(true)
    try {
      await resetPassword(resetEmail)
      toast.success('Revisá tu email para restablecer la contraseña')
      setShowForgotPassword(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo enviar el email'))
    } finally {
      setIsResetting(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (isGoogleLoading) return
    setIsGoogleLoading(true)
    try {
      await loginWithGoogle()
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo iniciar sesión con Google'))
      setIsGoogleLoading(false)
    }
  }

  if (showForgotPassword && isSupabase) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-center px-5 py-8">
        <h1 className="mb-2 text-3xl font-bold">Restablecer contraseña</h1>
        <p className="mb-8 text-[var(--muted)]">
          Te enviaremos un link a tu email
        </p>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => void handleResetPassword(event)}
        >
          <Input
            label="Email"
            name="reset-email"
            type="email"
            autoComplete="email"
            value={resetEmail}
            onChange={(event) => setResetEmail(event.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={isResetting}>
            {isResetting ? 'Enviando…' : 'Enviar link'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setShowForgotPassword(false)}
          >
            Volver al login
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-center px-5 py-8">
      <h1 className="mb-2 text-3xl font-bold">MisCuentas</h1>
      <p className="mb-8 text-[var(--muted)]">Iniciá sesión para continuar</p>

      <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button
          type="submit"
          className="mt-2 w-full"
          disabled={isSubmitting}
          aria-label="Iniciar sesión"
        >
          {isSubmitting ? 'Ingresando…' : 'Login'}
        </Button>
      </form>

      {isSupabase && (
        <>
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-sm text-[var(--muted)]">o</span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <GoogleSignInButton
            loading={isGoogleLoading}
            onClick={() => void handleGoogleLogin()}
          />

          <button
            type="button"
            className="mt-4 text-center text-sm text-[var(--blue)]"
            onClick={() => {
              setResetEmail(email)
              setShowForgotPassword(true)
            }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </>
      )}

      {isLocal && (
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Modo local: cualquier email y contraseña no vacíos.
        </p>
      )}
    </div>
  )
}
