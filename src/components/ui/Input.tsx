import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function Input({ label, id, className = '', ...props }: InputProps) {
  const inputId = id ?? props.name ?? label

  return (
    <label className="flex w-full flex-col gap-2 text-left" htmlFor={inputId}>
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <input
        id={inputId}
        className={`min-h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-lg outline-none focus:border-[var(--blue)] ${className}`}
        {...props}
      />
    </label>
  )
}
