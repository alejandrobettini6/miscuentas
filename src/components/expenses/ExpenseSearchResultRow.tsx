import { memo } from 'react'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { Currency } from '@/types/enums'
import type { CategoryRow as CategoryRowModel, Expense } from '@/types/models'
import type { ExpenseSearchResult } from '@/services/ExpenseSearchService'
import {
  accountingAmount,
  type ExchangeRates,
} from '@/services/AccountingCurrency'
import { formatLastMovementDelta, formatMoneyLabel } from '@/utils/formatters'

interface ExpenseSearchResultRowProps {
  result: ExpenseSearchResult
  accountingCurrency?: Currency
  rates?: ExchangeRates
  disabled?: boolean
  canRemoveCategory?: boolean
  onRegister: (row: CategoryRowModel) => void
  onEdit: (row: CategoryRowModel, expense: Expense) => void
  onDelete: (expense: Expense) => void
  onViewDetails: (row: CategoryRowModel) => void
  onRemoveCategory?: (row: CategoryRowModel) => void
}

function ExpenseSearchResultRowComponent({
  result,
  accountingCurrency = Currency.USD,
  rates = { usdWhite: 1, usdCash: 1 },
  disabled,
  canRemoveCategory = false,
  onRegister,
  onEdit,
  onDelete,
  onViewDetails,
  onRemoveCategory,
}: ExpenseSearchResultRowProps) {
  const row = result.row
  const isCategory = result.kind === 'category'
  const expense = result.kind === 'expense' ? result.expense : row.lastExpense
  const displayAmount = isCategory
    ? row.totalUsd
    : result.kind === 'expense'
      ? result.amount
      : 0
  const subtitle = isCategory
    ? row.lastExpense
      ? formatLastMovementDelta(
          accountingAmount(row.lastExpense, accountingCurrency, rates),
          accountingCurrency,
        )
      : null
    : result.kind === 'expense'
      ? result.detail
      : null
  const hasLast = Boolean(expense)
  const hasMovements = isCategory
    ? row.totalUsd !== 0 || hasLast
    : true
  const trashRemovesCategory = isCategory && canRemoveCategory && !hasLast

  return (
    <div className="flex items-center gap-1 border-b border-[var(--border)] py-3">
      <button
        type="button"
        className="min-h-10 flex-1 rounded-xl px-1 text-left active:bg-[var(--press)] disabled:opacity-50"
        onClick={() => onRegister(row)}
        disabled={disabled}
        aria-label={
          isCategory
            ? `Registrar en ${row.label}`
            : `Registrar en ${row.label}`
        }
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-lg font-medium">{row.label}</span>
          <span className="text-lg font-semibold tabular-nums">
            {formatMoneyLabel(displayAmount, accountingCurrency)}
          </span>
        </div>
        {subtitle ? (
          <div className="mt-1 text-sm text-[var(--muted)]">{subtitle}</div>
        ) : null}
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
        aria-label={
          isCategory
            ? `Editar último movimiento de ${row.label}`
            : `Editar movimiento de ${row.label}`
        }
        disabled={disabled || !expense}
        onClick={() => {
          if (expense) onEdit(row, expense)
        }}
      >
        <Pencil size={18} />
      </button>

      <button
        type="button"
        className="flex min-h-9 min-w-9 items-center justify-center rounded-xl text-[var(--red)] disabled:opacity-30"
        aria-label={
          trashRemovesCategory
            ? `Eliminar categoría ${row.label}`
            : isCategory
              ? `Eliminar último movimiento de ${row.label}`
              : `Eliminar movimiento de ${row.label}`
        }
        disabled={disabled || (!expense && !trashRemovesCategory)}
        onClick={() => {
          if (trashRemovesCategory) {
            onRemoveCategory?.(row)
            return
          }
          if (expense) onDelete(expense)
        }}
      >
        <Trash2 size={18} />
      </button>
    </div>
  )
}

export const ExpenseSearchResultRow = memo(ExpenseSearchResultRowComponent)
