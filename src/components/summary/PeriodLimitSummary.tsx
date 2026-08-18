import { SummaryCalculator } from '@/services/SummaryCalculator'
import { Currency } from '@/types/enums'
import { formatMoneyLabel } from '@/utils/formatters'

const HIDDEN_PLACEHOLDER = '••••••'

interface PeriodLimitSummaryProps {
  totalSpent: number
  monthlyLimit: number
  accountingCurrency?: Currency
  amountsHidden?: boolean
  className?: string
}

export function PeriodLimitSummary({
  totalSpent,
  monthlyLimit,
  accountingCurrency = Currency.USD,
  amountsHidden = false,
  className = '',
}: PeriodLimitSummaryProps) {
  const exceeded = SummaryCalculator.exceededAmount(totalSpent, monthlyLimit)
  const money = (amount: number) =>
    amountsHidden ? HIDDEN_PLACEHOLDER : formatMoneyLabel(amount, accountingCurrency)

  return (
    <div className={className}>
      <p className="text-sm text-[var(--muted)]">Total gastado este mes</p>
      <p
        className={`mt-1 text-4xl font-bold tabular-nums ${
          exceeded > 0 ? 'text-[var(--red)]' : 'text-[var(--text)]'
        }`}
      >
        {money(totalSpent)}
      </p>

      {exceeded > 0 && (
        <p className="mt-3 text-base text-[var(--red)]">
          Excedido:{' '}
          <span className="font-semibold">{money(exceeded)}</span>
        </p>
      )}

      <p className="mt-3 text-base text-[var(--muted)]">
        Límite:{' '}
        <span className="font-semibold text-[var(--text)]">
          {money(monthlyLimit)}
        </span>
      </p>
    </div>
  )
}
