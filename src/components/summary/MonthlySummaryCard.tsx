import { memo } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { ACCOUNT_LABELS } from '@/constants/categories'
import { AccountType, BudgetColor, Currency, SummaryDisplayMode } from '@/types/enums'
import type { MonthlySummary } from '@/types/models'
import { formatMoneyLabel, formatPercent } from '@/utils/formatters'
import { ProgressBar } from '@/components/ui/ProgressBar'

const HIDDEN_PLACEHOLDER = '••••••'

const TEXT_COLORS: Record<BudgetColor, string> = {
  [BudgetColor.GREEN]: 'text-[var(--green)]',
  [BudgetColor.YELLOW]: 'text-[var(--yellow-text)]',
  [BudgetColor.ORANGE]: 'text-[var(--orange)]',
  [BudgetColor.RED]: 'text-[var(--red)]',
}

interface MonthlySummaryCardProps {
  summary: MonthlySummary
  color: BudgetColor
  progress: number
  enabledAccounts?: AccountType[]
  accountingCurrency?: Currency
  displayMode?: SummaryDisplayMode
  amountsHidden?: boolean
  onToggleAmounts?: () => void
}

function MonthlySummaryCardComponent({
  summary,
  color,
  progress,
  enabledAccounts = [AccountType.WHITE, AccountType.CASH],
  accountingCurrency = Currency.USD,
  displayMode = SummaryDisplayMode.LIMIT,
  amountsHidden = false,
  onToggleAmounts,
}: MonthlySummaryCardProps) {
  const showAccountBreakdown = enabledAccounts.length === 2

  const money = (amount: number) =>
    amountsHidden ? HIDDEN_PLACEHOLDER : formatMoneyLabel(amount, accountingCurrency)

  const visibilityToggle = onToggleAmounts && (
    <button
      type="button"
      className="flex min-h-9 min-w-9 items-center justify-center rounded-xl text-[var(--muted)] active:bg-[var(--press)]"
      aria-label={amountsHidden ? 'Mostrar totales' : 'Ocultar totales'}
      aria-pressed={amountsHidden}
      onClick={onToggleAmounts}
    >
      {amountsHidden ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  )

  if (displayMode === SummaryDisplayMode.TOTAL) {
    return (
      <section className="rounded-2xl bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-[var(--muted)]">Total gastado este mes</p>
          {visibilityToggle}
        </div>
        <p className="mt-1 text-4xl font-bold tabular-nums text-[var(--text)]">
          {money(summary.totalSpent)}
        </p>

        {showAccountBreakdown && (
          <div className="mt-4 space-y-1 text-sm text-[var(--muted)]">
            {enabledAccounts.includes(AccountType.WHITE) && (
              <p>
                {ACCOUNT_LABELS[AccountType.WHITE]}{' '}
                <span className="font-semibold text-[var(--text)]">
                  {money(summary.totalWhite)}
                </span>
              </p>
            )}
            {enabledAccounts.includes(AccountType.CASH) && (
              <p>
                {ACCOUNT_LABELS[AccountType.CASH]}{' '}
                <span className="font-semibold text-[var(--text)]">
                  {money(summary.totalCash)}
                </span>
              </p>
            )}
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="rounded-2xl bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-[var(--muted)]">Disponible este mes</p>
        {visibilityToggle}
      </div>
      <p className={`mt-1 text-4xl font-bold tabular-nums ${TEXT_COLORS[color]}`}>
        {money(summary.available)}
      </p>

      <div className="mt-4">
        <ProgressBar ratio={progress} color={color} />
      </div>

      <p className={`mt-2 text-lg font-semibold ${TEXT_COLORS[color]}`}>
        {formatPercent(Math.max(0, summary.remainingPercent))}
      </p>

      <p className="mt-3 text-base text-[var(--muted)]">
        Total gastado{' '}
        <span className="font-semibold text-[var(--text)]">
          {money(summary.totalSpent)}
        </span>
      </p>

      {enabledAccounts.length > 0 && (
        <div className="mt-2 space-y-1 text-sm text-[var(--muted)]">
          {enabledAccounts.includes(AccountType.WHITE) && (
            <p>
              {ACCOUNT_LABELS[AccountType.WHITE]}{' '}
              <span className="font-semibold text-[var(--text)]">
                {money(summary.totalWhite)}
              </span>
            </p>
          )}
          {enabledAccounts.includes(AccountType.CASH) && (
            <p>
              {ACCOUNT_LABELS[AccountType.CASH]}{' '}
              <span className="font-semibold text-[var(--text)]">
                {money(summary.totalCash)}
              </span>
            </p>
          )}
        </div>
      )}
    </section>
  )
}

export const MonthlySummaryCard = memo(MonthlySummaryCardComponent)
