import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Muestra botón para revelar/ocultar cuando type es password. */
  revealPassword?: boolean
}

export function Input({
  label,
  id,
  className = '',
  revealPassword = false,
  type,
  ...props
}: InputProps) {
  const inputId = id ?? props.name ?? label
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  const showToggle = revealPassword && isPassword
  const resolvedType = showToggle && visible ? 'text' : type

  return (
    <label className="flex w-full flex-col gap-2 text-left" htmlFor={inputId}>
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <div className="relative w-full">
        <input
          id={inputId}
          type={resolvedType}
          className={`min-h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-lg outline-none focus:border-[var(--blue)] ${
            showToggle ? 'pr-12' : ''
          } ${className}`}
          {...props}
        />
        {showToggle && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex min-w-12 items-center justify-center text-[var(--muted)]"
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
          >
            {visible ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
    </label>
  )
}
