import { memo } from 'react'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { Currency } from '@/types/enums'
import type { CategoryRow as CategoryRowModel } from '@/types/models'
import { accountingAmount, type ExchangeRates } from '@/services/AccountingCurrency'
import { formatLastMovementDelta, formatMoneyLabel } from '@/utils/formatters'

interface CategoryRowProps {
  row: CategoryRowModel
  accountingCurrency?: Currency
  rates?: ExchangeRates
  disabled?: boolean
  /** Categoría personalizada sin movimientos: el trash la elimina. */
  canRemoveCategory?: boolean
  onRegister: (row: CategoryRowModel) => void
  onEdit: (row: CategoryRowModel) => void
  onDelete: (row: CategoryRowModel) => void
  onViewDetails: (row: CategoryRowModel) => void
  onRemoveCategory?: (row: CategoryRowModel) => void
}

function CategoryRowComponent({
  row,
  accountingCurrency = Currency.USD,
  rates = { usdWhite: 1, usdCash: 1 },
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
    ? accountingAmount(row.lastExpense, accountingCurrency, rates)
    : 0

  return (
    <div className="flex items-center gap-1 border-b border-[var(--border)] py-3">
      <button
        type="button"
        className="min-h-10 flex-1 rounded-xl px-1 text-left active:bg-[var(--press)] disabled:opacity-50"
        onClick={() => onRegister(row)}
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
        className="flex min-h-9 min-w-9 items-center justify-center rounded-xl text-[var(--blue)] disabled:opacity-30"
        aria-label={`Agregar gasto en ${row.label}`}
        disabled={disabled}
        onClick={() => onRegister(row)}
      >
        <Plus size={18} />
      </button>

      <button
        type="button"
        className="flex min-h-9 min-w-9 items-center justify-center rounded-xl text-[var(--blue)] disabled:opacity-30"
        aria-label={`Ver detalles de ${row.label}`}
        disabled={disabled || !hasMovements}
        onClick={() => onViewDetails(row)}
      >
        <Eye size={18} />
      </button>

      <button
        type="button"
        className="flex min-h-9 min-w-9 items-center justify-center rounded-xl text-[var(--blue)] disabled:opacity-30"
        aria-label={`Editar último movimiento de ${row.label}`}
        disabled={disabled || !hasLast}
        onClick={() => onEdit(row)}
      >
        <Pencil size={18} />
      </button>

      <button
        type="button"
        className="flex min-h-9 min-w-9 items-center justify-center rounded-xl text-[var(--red)] disabled:opacity-30"
        aria-label={
          trashRemovesCategory
            ? `Eliminar categoría ${row.label}`
            : `Eliminar último movimiento de ${row.label}`
        }
        disabled={disabled || (!hasLast && !trashRemovesCategory)}
        onClick={() => {
          if (trashRemovesCategory) {
            onRemoveCategory?.(row)
            return
          }
          onDelete(row)
        }}
      >
        <Trash2 size={18} />
      </button>
    </div>
  )
}

export const CategoryRow = memo(CategoryRowComponent)
