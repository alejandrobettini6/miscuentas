import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'

interface AddCategoryRowProps {
  disabled?: boolean
  onAdd: (name: string) => void | Promise<void>
}

export function AddCategoryRow({ disabled, onAdd }: AddCategoryRowProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
    }
  }, [editing])

  const reset = () => {
    setEditing(false)
    setName('')
    setError(null)
    setBusy(false)
  }

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Ingresá un nombre')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onAdd(trimmed)
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar')
      setBusy(false)
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 py-3">
        <button
          type="button"
          className="flex min-h-11 flex-1 items-center rounded-xl border border-dashed border-[var(--border)] px-3 text-left text-[var(--muted)] active:bg-black/5 disabled:opacity-50"
          onClick={() => setEditing(true)}
          disabled={disabled}
          aria-label="Nueva categoría"
        >
          <span className="text-lg">Nueva categoría</span>
        </button>
        <button
          type="button"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[var(--blue)] disabled:opacity-30"
          aria-label="Agregar categoría"
          disabled={disabled}
          onClick={() => setEditing(true)}
        >
          <Plus size={22} />
        </button>
      </div>
    )
  }

  return (
    <div className="py-3">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={name}
          maxLength={40}
          disabled={busy || disabled}
          placeholder="Nombre de la categoría"
          aria-label="Nombre de la categoría"
          aria-invalid={Boolean(error)}
          className="min-h-11 flex-1 rounded-xl border border-dashed border-[var(--border)] px-3 text-base outline-none focus:border-[var(--blue)]"
          onChange={(event) => {
            setName(event.target.value)
            if (error) setError(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void submit()
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              reset()
            }
          }}
        />
        <button
          type="button"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[var(--blue)] disabled:opacity-30"
          aria-label="Confirmar categoría"
          disabled={busy || disabled}
          onClick={() => void submit()}
        >
          <Plus size={22} />
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-[var(--red)]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
