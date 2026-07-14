import { ACCOUNT_LABELS } from '@/constants/categories'
import { AccountType, BudgetColor } from '@/types/enums'
import type { MonthlySummary } from '@/types/models'
import { formatPercent, formatUsdLabel } from '@/utils/formatters'
import { ProgressBar } from '@/components/ui/ProgressBar'

const TEXT_COLORS: Record<BudgetColor, string> = {
  [BudgetColor.GREEN]: 'text-[var(--green)]',
  [BudgetColor.YELLOW]: 'text-[#b58900]',
  [BudgetColor.ORANGE]: 'text-[var(--orange)]',
  [BudgetColor.RED]: 'text-[var(--red)]',
}

interface MonthlySummaryCardProps {
  summary: MonthlySummary
  color: BudgetColor
  progress: number
}

export function MonthlySummaryCard({
  summary,
  color,
  progress,
}: MonthlySummaryCardProps) {
  return (
    <section className="rounded-2xl bg-white p-5">
      <p className="text-sm text-[var(--muted)]">Disponible este mes</p>
      <p className={`mt-1 text-4xl font-bold tabular-nums ${TEXT_COLORS[color]}`}>
        {formatUsdLabel(summary.available)}
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
          {formatUsdLabel(summary.totalSpent)}
        </span>
      </p>

      <div className="mt-2 space-y-1 text-sm text-[var(--muted)]">
        <p>
          {ACCOUNT_LABELS[AccountType.WHITE]}{' '}
          <span className="font-semibold text-[var(--text)]">
            {formatUsdLabel(summary.totalWhite)}
          </span>
        </p>
        <p>
          {ACCOUNT_LABELS[AccountType.CASH]}{' '}
          <span className="font-semibold text-[var(--text)]">
            {formatUsdLabel(summary.totalCash)}
          </span>
        </p>
      </div>
    </section>
  )
}
