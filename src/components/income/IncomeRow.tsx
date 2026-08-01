import { memo } from 'react'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { Currency } from '@/types/enums'
import type { IncomeRow as IncomeRowModel } from '@/types/models'
import { accountingAmountFromRecord, type ExchangeRates } from '@/services/AccountingCurrency'
import { formatLastMovementDelta, formatMoneyLabel } from '@/utils/formatters'

interface IncomeRowProps {
  row: IncomeRowModel
  accountingCurrency?: Currency
  rates?: ExchangeRates
  disabled?: boolean
  onRegister: (row: IncomeRowModel) => void
  onEdit: (row: IncomeRowModel) => void
  onDelete: (row: IncomeRowModel) => void
  onViewDetails: (row: IncomeRowModel) => void
}

function IncomeRowComponent({
  row,
  accountingCurrency = Currency.USD,
  rates = { usdWhite: 1, usdCash: 1 },
  disabled,
  onRegister,
  onEdit,
  onDelete,
  onViewDetails,
}: IncomeRowProps) {
  const hasLast = Boolean(row.lastIncome)
  const hasMovements = row.totalUsd !== 0 || hasLast
  const lastAmount = row.lastIncome
    ? accountingAmountFromRecord(row.lastIncome, accountingCurrency, rates)
    : 0

  return (
    <div className="flex items-center gap-1 border-b border-[var(--border)] py-3">
      <button
        type="button"
        className="min-h-10 flex-1 rounded-xl px-1 text-left active:bg-[var(--press)] disabled:opacity-50"
        onClick={() => onRegister(row)}
        disabled={disabled}
        aria-label={`Registrar ingreso en ${row.label}`}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-lg font-medium">{row.label}</span>
          <span className="text-lg font-semibold tabular-nums">
            {formatMoneyLabel(row.totalUsd, accountingCurrency)}
          </span>
        </div>
        {row.lastIncome && (
          <div className="mt-1 text-sm text-[var(--muted)]">
            {formatLastMovementDelta(lastAmount, accountingCurrency)}
          </div>
        )}
      </button>

      <button
        type="button"
        className="flex min-h-9 min-w-9 items-center justify-center rounded-xl text-[var(--blue)] disabled:opacity-30"
        aria-label={`Agregar ingreso en ${row.label}`}
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
        aria-label={`Editar último ingreso de ${row.label}`}
        disabled={disabled || !hasLast}
        onClick={() => onEdit(row)}
      >
        <Pencil size={18} />
      </button>

      <button
        type="button"
        className="flex min-h-9 min-w-9 items-center justify-center rounded-xl text-[var(--red)] disabled:opacity-30"
        aria-label={`Eliminar último ingreso de ${row.label}`}
        disabled={disabled || !hasLast}
        onClick={() => onDelete(row)}
      >
        <Trash2 size={18} />
      </button>
    </div>
  )
}

export const IncomeRow = memo(IncomeRowComponent)
