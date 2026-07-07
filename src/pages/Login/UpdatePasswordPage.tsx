import { useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthContext } from '@/contexts/AuthContext'
import { getErrorMessage } from '@/utils/errors'

export function UpdatePasswordPage() {
  const { updatePassword } = useAuthContext()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setIsSubmitting(true)
    try {
      await updatePassword(password)
      toast.success('Contraseña actualizada')
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo actualizar la contraseña'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-center px-5 py-8">
      <h1 className="mb-2 text-3xl font-bold">Nueva contraseña</h1>
      <p className="mb-8 text-[var(--muted)]">Elegí una contraseña nueva para tu cuenta</p>

      <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <Input
          label="Nueva contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Input
          label="Confirmar contraseña"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          required
        />
        <Button
          type="submit"
          className="mt-2 w-full"
          disabled={isSubmitting}
          aria-label="Guardar contraseña"
        >
          {isSubmitting ? 'Guardando…' : 'Guardar'}
        </Button>
      </form>
    </div>
  )
}
