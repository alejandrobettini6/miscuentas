import { Pencil, Trash2 } from 'lucide-react'
import { Currency } from '@/types/enums'
import type { Income, IncomeRow } from '@/types/models'
import { accountingAmountFromRecord, type ExchangeRates } from '@/services/AccountingCurrency'
import { formatDetailTimestamp } from '@/utils/date'
import { formatMoneyLabel } from '@/utils/formatters'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface IncomeDetailsModalProps {
  open: boolean
  row: IncomeRow | null
  items: Income[]
  total: number
  accountingCurrency?: Currency
  rates?: ExchangeRates
  isReadOnly?: boolean
  onClose: () => void
  onEditIncome?: (income: Income) => void
  onDeleteIncome?: (income: Income) => void
}

export function IncomeDetailsModal({
  open,
  row,
  items,
  total,
  accountingCurrency = Currency.USD,
  rates = { usdWhite: 1, usdCash: 1 },
  isReadOnly = false,
  onClose,
  onEditIncome,
  onDeleteIncome,
}: IncomeDetailsModalProps) {
  if (!row) return null

  const canEditItems =
    !isReadOnly && (Boolean(onEditIncome) || Boolean(onDeleteIncome))

  return (
    <Modal open={open} title={row.label} onClose={onClose}>
      <div className="mb-4">
        <p className="text-base text-[var(--muted)]">
          Total{' '}
          <span className="font-semibold text-[var(--text)]">
            {formatMoneyLabel(total, accountingCurrency)}
          </span>
        </p>
      </div>

      {items.length === 0 ? (
        <p className="mb-4 text-sm text-[var(--muted)]">Sin ingresos registrados</p>
      ) : (
        <ul className="mb-4 max-h-72 space-y-3 overflow-y-auto">
          {items.map((income) => {
            const convertedAmount = accountingAmountFromRecord(
              income,
              accountingCurrency,
              rates,
            )
            const detail = income.description.trim()

            return (
              <li
                key={income.id}
                className="flex items-center gap-2 border-b border-[var(--border)] pb-3 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-[var(--muted)]">
                      {formatDetailTimestamp(income.createdAt)}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatMoneyLabel(convertedAmount, accountingCurrency)}
                    </span>
                  </div>
                  {detail ? (
                    <p className="mt-1 text-sm font-medium text-[var(--text)]">{detail}</p>
                  ) : null}
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {formatMoneyLabel(income.originalAmount, income.originalCurrency)}
                  </p>
                </div>
                {canEditItems && (
                  <div className="flex shrink-0 items-center gap-1">
                    {onEditIncome && (
                      <button
                        type="button"
                        className="flex min-h-9 min-w-9 items-center justify-center rounded-xl text-[var(--blue)]"
                        aria-label="Editar ingreso"
                        onClick={() => onEditIncome(income)}
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {onDeleteIncome && (
                      <button
                        type="button"
                        className="flex min-h-9 min-w-9 items-center justify-center rounded-xl text-[var(--red)]"
                        aria-label="Eliminar ingreso"
                        onClick={() => onDeleteIncome(income)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <Button variant="secondary" className="w-full" onClick={onClose}>
        Cerrar
      </Button>
    </Modal>
  )
}
