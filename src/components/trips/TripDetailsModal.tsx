import { Pencil, Trash2 } from 'lucide-react'
import { ACCOUNT_LABELS } from '@/constants/categories'
import { AccountType, Currency } from '@/types/enums'
import type { TripCategoryRow, TripExpense } from '@/types/models'
import { accountingAmountFromRecord, type ExchangeRates } from '@/services/AccountingCurrency'
import { formatDetailTimestamp } from '@/utils/date'
import { formatMoneyLabel } from '@/utils/formatters'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface TripDetailsModalProps {
  open: boolean
  row: TripCategoryRow | null
  accountType: AccountType
  items: TripExpense[]
  totalWhite: number
  totalCash: number
  enabledAccounts: AccountType[]
  accountingCurrency: Currency
  rates: ExchangeRates
  onClose: () => void
  onRemoveCategory?: () => void
  onEditExpense?: (expense: TripExpense) => void
  onDeleteExpense?: (expense: TripExpense) => void
}

export function TripDetailsModal({
  open,
  row,
  accountType,
  items,
  totalWhite,
  totalCash,
  enabledAccounts,
  accountingCurrency,
  rates,
  onClose,
  onRemoveCategory,
  onEditExpense,
  onDeleteExpense,
}: TripDetailsModalProps) {
  if (!row) return null

  const accountTotal = accountType === AccountType.WHITE ? totalWhite : totalCash
  const canDeleteCategory = row.isOtrosGrande && Boolean(onRemoveCategory)
  const showBoth =
    enabledAccounts.includes(AccountType.WHITE) &&
    enabledAccounts.includes(AccountType.CASH)
  const canEditItems = Boolean(onEditExpense) || Boolean(onDeleteExpense)

  return (
    <Modal open={open} title={row.label} onClose={onClose}>
      <div className="mb-4 space-y-1">
        <p className="text-base text-[var(--muted)]">
          Total en {ACCOUNT_LABELS[accountType]}{' '}
          <span className="font-semibold text-[var(--text)]">
            {formatMoneyLabel(accountTotal, accountingCurrency)}
          </span>
        </p>
        {showBoth && (
          <p className="text-sm text-[var(--muted)]">
            {ACCOUNT_LABELS[AccountType.WHITE]}{' '}
            <span className="font-semibold text-[var(--text)]">
              {formatMoneyLabel(totalWhite, accountingCurrency)}
            </span>
            {' · '}
            {ACCOUNT_LABELS[AccountType.CASH]}{' '}
            <span className="font-semibold text-[var(--text)]">
              {formatMoneyLabel(totalCash, accountingCurrency)}
            </span>
          </p>
        )}
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto">
        {items.length === 0 && (
          <p className="py-4 text-center text-sm text-[var(--muted)]">Sin movimientos</p>
        )}
        {items.map((expense) => {
          const amount = accountingAmountFromRecord(expense, accountingCurrency, rates)
          return (
            <div
              key={expense.id}
              className="flex items-center gap-2 rounded-xl bg-[var(--surface-2)] px-3 py-2"
            >
              <div className="flex-1">
                <p className="text-sm font-semibold tabular-nums">
                  {formatMoneyLabel(amount, accountingCurrency)}
                </p>
                {expense.description && (
                  <p className="text-xs text-[var(--muted)]">{expense.description}</p>
                )}
                <p className="text-xs text-[var(--muted)]">
                  {formatDetailTimestamp(expense.createdAt)}
                </p>
              </div>
              {canEditItems && (
                <div className="flex gap-1">
                  {onEditExpense && (
                    <button
                      type="button"
                      className="flex min-h-8 min-w-8 items-center justify-center rounded-lg text-[var(--blue)]"
                      aria-label="Editar"
                      onClick={() => onEditExpense(expense)}
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {onDeleteExpense && (
                    <button
                      type="button"
                      className="flex min-h-8 min-w-8 items-center justify-center rounded-lg text-[var(--red)]"
                      aria-label="Eliminar"
                      onClick={() => onDeleteExpense(expense)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {canDeleteCategory && (
        <div className="mt-4">
          <Button variant="danger" className="w-full" onClick={onRemoveCategory}>
            Eliminar categoría
          </Button>
        </div>
      )}
    </Modal>
  )
}
