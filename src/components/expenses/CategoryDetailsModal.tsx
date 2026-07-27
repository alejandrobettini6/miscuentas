import { Pencil, Trash2 } from 'lucide-react'
import { ACCOUNT_LABELS } from '@/constants/categories'
import { AccountType, Category, Currency } from '@/types/enums'
import type { CategoryRow, Expense } from '@/types/models'
import { accountingAmount, type ExchangeRates } from '@/services/AccountingCurrency'
import { formatDetailTimestamp } from '@/utils/date'
import { formatMoneyLabel } from '@/utils/formatters'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface CategoryDetailsModalProps {
  open: boolean
  row: CategoryRow | null
  accountType: AccountType
  items: Expense[]
  totalWhite: number
  totalCash: number
  enabledAccounts?: AccountType[]
  accountingCurrency?: Currency
  rates?: ExchangeRates
  isReadOnly?: boolean
  onClose: () => void
  onRemoveCategory?: () => void
  onEditExpense?: (expense: Expense) => void
  onDeleteExpense?: (expense: Expense) => void
}

export function CategoryDetailsModal({
  open,
  row,
  accountType,
  items,
  totalWhite,
  totalCash,
  enabledAccounts = [AccountType.WHITE, AccountType.CASH],
  accountingCurrency = Currency.USD,
  rates = { usdWhite: 1, usdCash: 1 },
  isReadOnly = false,
  onClose,
  onRemoveCategory,
  onEditExpense,
  onDeleteExpense,
}: CategoryDetailsModalProps) {
  if (!row) return null

  const accountTotal =
    accountType === AccountType.WHITE ? totalWhite : totalCash
  const showDetailLabel = row.category !== Category.OTHER && !row.isOtrosGrande
  const canDeleteCategory = row.isOtrosGrande && Boolean(onRemoveCategory)
  const showBoth =
    enabledAccounts.includes(AccountType.WHITE) &&
    enabledAccounts.includes(AccountType.CASH)
  const canEditItems = !isReadOnly && (Boolean(onEditExpense) || Boolean(onDeleteExpense))

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
          <>
            <p className="text-sm text-[var(--muted)]">
              {ACCOUNT_LABELS[AccountType.WHITE]}{' '}
              <span className="font-medium text-[var(--text)]">
                {formatMoneyLabel(totalWhite, accountingCurrency)}
              </span>
              {' · '}
              {ACCOUNT_LABELS[AccountType.CASH]}{' '}
              <span className="font-medium text-[var(--text)]">
                {formatMoneyLabel(totalCash, accountingCurrency)}
              </span>
            </p>
            <p className="text-xs text-[var(--muted)]">
              Totales de esta categoría en ambas cuentas
            </p>
          </>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mb-4 text-sm text-[var(--muted)]">
          Sin movimientos en {ACCOUNT_LABELS[accountType]}
        </p>
      ) : (
        <ul className="mb-4 max-h-72 space-y-3 overflow-y-auto">
          {items.map((expense) => {
            const detail = showDetailLabel
              ? (expense.description ?? 'Varios')
              : null
            return (
              <li
                key={expense.id}
                className="flex items-center gap-2 border-b border-[var(--border)] pb-3 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-[var(--muted)]">
                      {formatDetailTimestamp(expense.createdAt)}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatMoneyLabel(
                        accountingAmount(expense, accountingCurrency, rates),
                        accountingCurrency,
                      )}
                    </span>
                  </div>
                  {detail && (
                    <p className="mt-1 text-sm font-medium text-[var(--text)]">
                      {detail}
                    </p>
                  )}
                </div>
                {canEditItems && (
                  <div className="flex shrink-0 items-center gap-1">
                    {onEditExpense && (
                      <button
                        type="button"
                        className="flex min-h-9 min-w-9 items-center justify-center rounded-xl text-[var(--blue)]"
                        aria-label="Editar movimiento"
                        onClick={() => onEditExpense(expense)}
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {onDeleteExpense && (
                      <button
                        type="button"
                        className="flex min-h-9 min-w-9 items-center justify-center rounded-xl text-[var(--red)]"
                        aria-label="Eliminar movimiento"
                        onClick={() => onDeleteExpense(expense)}
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

      <div className="flex flex-col gap-2">
        {canDeleteCategory && (
          <Button
            variant="danger"
            className="w-full"
            onClick={onRemoveCategory}
          >
            Eliminar categoría
          </Button>
        )}
        <Button variant="secondary" className="w-full" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  )
}
