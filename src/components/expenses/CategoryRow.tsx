import { Eye, Pencil, Trash2 } from 'lucide-react'
import { Currency } from '@/types/enums'
import type { CategoryRow as CategoryRowModel } from '@/types/models'
import { accountingAmount } from '@/services/AccountingCurrency'
import { formatLastMovementDelta, formatMoneyLabel } from '@/utils/formatters'

interface CategoryRowProps {
  row: CategoryRowModel
  accountingCurrency?: Currency
  disabled?: boolean
  /** Categoría personalizada sin movimientos: el trash la elimina. */
  canRemoveCategory?: boolean
  onRegister: () => void
  onEdit: () => void
  onDelete: () => void
  onViewDetails: () => void
  onRemoveCategory?: () => void
}

export function CategoryRow({
  row,
  accountingCurrency = Currency.USD,
  disabled,
  canRemoveCategory = false,
  onRegister,
  onEdit,
  onDelete,
  onViewDetails,
  onRemoveCategory,
}: CategoryRowProps) {
  const hasLast = Boolean(row.lastExpense)
  const hasMovements = row.totalUsd !== 0 || hasLast
  const trashRemovesCategory = canRemoveCategory && !hasLast
  const lastAmount = row.lastExpense
    ? accountingAmount(row.lastExpense, accountingCurrency)
    : 0

  return (
    <div className="flex items-center gap-2 border-b border-[var(--border)] py-3">
      <button
        type="button"
        className="min-h-11 flex-1 rounded-xl px-1 text-left active:bg-black/5 disabled:opacity-50"
        onClick={onRegister}
        disabled={disabled}
        aria-label={`Registrar en ${row.label}`}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-lg font-medium">{row.label}</span>
          <span className="text-lg font-semibold tabular-nums">
            {formatMoneyLabel(row.totalUsd, accountingCurrency)}
          </span>
        </div>
        {row.lastExpense && (
          <div className="mt-1 text-sm text-[var(--muted)]">
            {formatLastMovementDelta(lastAmount, accountingCurrency)}
          </div>
        )}
      </button>

      <button
        type="button"
        className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[var(--blue)] disabled:opacity-30"
        aria-label={`Ver detalles de ${row.label}`}
        disabled={disabled || !hasMovements}
        onClick={onViewDetails}
      >
        <Eye size={20} />
      </button>

      <button
        type="button"
        className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[var(--blue)] disabled:opacity-30"
        aria-label={`Editar último movimiento de ${row.label}`}
        disabled={disabled || !hasLast}
        onClick={onEdit}
      >
        <Pencil size={20} />
      </button>

      <button
        type="button"
        className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[var(--red)] disabled:opacity-30"
        aria-label={
          trashRemovesCategory
            ? `Eliminar categoría ${row.label}`
            : `Eliminar último movimiento de ${row.label}`
        }
        disabled={disabled || (!hasLast && !trashRemovesCategory)}
        onClick={() => {
          if (trashRemovesCategory) {
            onRemoveCategory?.()
            return
          }
          onDelete()
        }}
      >
        <Trash2 size={20} />
      </button>
    </div>
  )
}
