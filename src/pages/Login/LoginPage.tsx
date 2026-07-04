import { useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthContext } from '@/contexts/AuthContext'
import { getDataMode } from '@/config/env'
import { getErrorMessage } from '@/utils/errors'

export function LoginPage() {
  const { login } = useAuthContext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isLocal = getDataMode() === 'local'

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

      {isLocal && (
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Modo local: cualquier email y contraseña no vacíos.
        </p>
      )}
    </div>
  )
}
