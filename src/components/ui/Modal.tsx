import type { ReactNode } from 'react'
import { useBackButtonClose } from '@/hooks/useBackButtonClose'

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose?: () => void
  /** Encima de otros modales (p. ej. confirmación mientras Ver detalle sigue abierto). */
  elevated?: boolean
}

export function Modal({ open, title, children, onClose, elevated }: ModalProps) {
  useBackButtonClose(open, onClose)

  if (!open) return null

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-[var(--overlay)] p-4 ${elevated ? 'z-[60]' : 'z-50'}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  )
}
