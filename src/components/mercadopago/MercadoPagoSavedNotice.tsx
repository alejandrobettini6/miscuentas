import { useEffect, useRef } from 'react'
import { CATEGORY_LABELS } from '@/constants/categories'
import { Button } from '@/components/ui/Button'
import type { MercadoPagoAutoExpense } from '@/services/mercadopago/planNotice'
import { formatMoneyLabel } from '@/utils/formatters'

const AUTO_CLOSE_MS = 5000

interface MercadoPagoSavedNoticeProps {
  expense: MercadoPagoAutoExpense
  onClose: () => void
}

export function MercadoPagoSavedNotice({ expense, onClose }: MercadoPagoSavedNoticeProps) {
  const closedFor = useRef<string | null>(null)

  const finish = () => {
    if (closedFor.current === expense.externalId) return
    closedFor.current = expense.externalId
    onClose()
  }

  useEffect(() => {
    const timer = window.setTimeout(finish, AUTO_CLOSE_MS)
    return () => window.clearTimeout(timer)
  }, [expense.externalId, onClose])

  const category = expense.customName ?? CATEGORY_LABELS[expense.category]
  const detail = [formatMoneyLabel(expense.amount, expense.currency), expense.detail, category]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--overlay)] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Gasto de Mercado Pago registrado"
    >
      <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-5 shadow-lg">
        <h2 className="mb-2 text-lg font-semibold">Registramos un gasto con Mercado Pago</h2>
        <p className="mb-1 text-sm text-[var(--text)]">{detail}</p>
        <p className="mb-4 text-sm text-[var(--muted)]">Se cierra solo.</p>
        <Button onClick={finish} className="w-full">
          Aceptar
        </Button>
      </div>
    </div>
  )
}
