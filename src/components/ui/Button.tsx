import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-[var(--blue)] text-white',
  secondary: 'bg-[#e5e5ea] text-[var(--text)]',
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
      className={`min-h-11 min-w-11 rounded-xl px-4 py-3 font-medium transition active:scale-[0.98] disabled:active:scale-100 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
