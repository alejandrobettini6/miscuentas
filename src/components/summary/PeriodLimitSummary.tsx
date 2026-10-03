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
  /** Tipografía más chica para la card de resumen en Home. */
  dense?: boolean
}

export function PeriodLimitSummary({
  totalSpent,
  monthlyLimit,
  accountingCurrency = Currency.USD,
  amountsHidden = false,
  className = '',
  dense = false,
}: PeriodLimitSummaryProps) {
  const exceeded = SummaryCalculator.exceededAmount(totalSpent, monthlyLimit)
  const money = (amount: number) =>
    amountsHidden ? HIDDEN_PLACEHOLDER : formatMoneyLabel(amount, accountingCurrency)

  const labelClass = dense ? 'text-xs' : 'text-sm'
  const amountClass = dense ? 'text-2xl sm:text-3xl' : 'text-4xl'
  const detailClass = dense ? 'mt-2 text-sm' : 'mt-3 text-base'

  return (
    <div className={className}>
      <p className={`${labelClass} text-[var(--muted)]`}>Total gastado este mes</p>
      <p
        className={`mt-0.5 ${amountClass} font-bold tabular-nums ${
          exceeded > 0 ? 'text-[var(--red)]' : 'text-[var(--text)]'
        }`}
      >
        {money(totalSpent)}
      </p>

      {exceeded > 0 && (
        <p className={`${detailClass} text-[var(--red)]`}>
          Excedido:{' '}
          <span className="font-semibold">{money(exceeded)}</span>
        </p>
      )}

      <p className={`${detailClass} text-[var(--muted)]`}>
        Límite:{' '}
        <span className="font-semibold text-[var(--text)]">
          {money(monthlyLimit)}
        </span>
      </p>
    </div>
  )
}
