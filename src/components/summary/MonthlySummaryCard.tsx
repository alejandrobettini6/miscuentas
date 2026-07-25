import { memo } from 'react'
import { ACCOUNT_LABELS } from '@/constants/categories'
import { AccountType, BudgetColor, Currency, SummaryDisplayMode } from '@/types/enums'
import type { MonthlySummary } from '@/types/models'
import { formatMoneyLabel, formatPercent } from '@/utils/formatters'
import { ProgressBar } from '@/components/ui/ProgressBar'

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
}

function MonthlySummaryCardComponent({
  summary,
  color,
  progress,
  enabledAccounts = [AccountType.WHITE, AccountType.CASH],
  accountingCurrency = Currency.USD,
  displayMode = SummaryDisplayMode.LIMIT,
}: MonthlySummaryCardProps) {
  const showAccountBreakdown = enabledAccounts.length === 2

  if (displayMode === SummaryDisplayMode.TOTAL) {
    return (
      <section className="rounded-2xl bg-[var(--surface)] p-5">
        <p className="text-sm text-[var(--muted)]">Total gastado este mes</p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-[var(--text)]">
          {formatMoneyLabel(summary.totalSpent, accountingCurrency)}
        </p>

        {showAccountBreakdown && (
          <div className="mt-4 space-y-1 text-sm text-[var(--muted)]">
            {enabledAccounts.includes(AccountType.WHITE) && (
              <p>
                {ACCOUNT_LABELS[AccountType.WHITE]}{' '}
                <span className="font-semibold text-[var(--text)]">
                  {formatMoneyLabel(summary.totalWhite, accountingCurrency)}
                </span>
              </p>
            )}
            {enabledAccounts.includes(AccountType.CASH) && (
              <p>
                {ACCOUNT_LABELS[AccountType.CASH]}{' '}
                <span className="font-semibold text-[var(--text)]">
                  {formatMoneyLabel(summary.totalCash, accountingCurrency)}
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
      <p className="text-sm text-[var(--muted)]">Disponible este mes</p>
      <p className={`mt-1 text-4xl font-bold tabular-nums ${TEXT_COLORS[color]}`}>
        {formatMoneyLabel(summary.available, accountingCurrency)}
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
          {formatMoneyLabel(summary.totalSpent, accountingCurrency)}
        </span>
      </p>

      {enabledAccounts.length > 0 && (
        <div className="mt-2 space-y-1 text-sm text-[var(--muted)]">
          {enabledAccounts.includes(AccountType.WHITE) && (
            <p>
              {ACCOUNT_LABELS[AccountType.WHITE]}{' '}
              <span className="font-semibold text-[var(--text)]">
                {formatMoneyLabel(summary.totalWhite, accountingCurrency)}
              </span>
            </p>
          )}
          {enabledAccounts.includes(AccountType.CASH) && (
            <p>
              {ACCOUNT_LABELS[AccountType.CASH]}{' '}
              <span className="font-semibold text-[var(--text)]">
                {formatMoneyLabel(summary.totalCash, accountingCurrency)}
              </span>
            </p>
          )}
        </div>
      )}
    </section>
  )
}

export const MonthlySummaryCard = memo(MonthlySummaryCardComponent)
