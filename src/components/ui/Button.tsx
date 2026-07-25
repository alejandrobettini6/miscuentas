import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-[var(--blue)] text-white',
  secondary: 'bg-[var(--fill)] text-[var(--text)]',
  danger: 'bg-[var(--red)] text-white',
  ghost: 'bg-transparent text-[var(--blue)]',
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`min-h-10 min-w-10 rounded-xl px-3.5 py-2 text-sm font-medium transition active:scale-[0.98] disabled:active:scale-100 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
