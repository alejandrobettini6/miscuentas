import { memo } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { ACCOUNT_LABELS } from '@/constants/categories'
import { AccountType, Currency } from '@/types/enums'
import type { IncomeSummary } from '@/types/models'
import { formatMoneyLabel } from '@/utils/formatters'

const HIDDEN_PLACEHOLDER = '••••••'

interface IncomeSummaryCardProps {
  summary: IncomeSummary
  enabledAccounts?: AccountType[]
  accountingCurrency?: Currency
  amountsHidden?: boolean
  onToggleAmounts?: () => void
}

function SummaryLine({
  label,
  total,
  white,
  cash,
  showAccountBreakdown,
  money,
}: {
  label: string
  total: number
  white: number
  cash: number
  showAccountBreakdown: boolean
  money: (amount: number) => string
}) {
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">{label}</p>
        <p className="text-base font-semibold tabular-nums text-[var(--text)]">
          {money(total)}
        </p>
      </div>
      {showAccountBreakdown && (
        <p className="mt-1 text-xs text-[var(--muted)]">
          {ACCOUNT_LABELS[AccountType.WHITE]}{' '}
          <span className="font-medium text-[var(--text)]">{money(white)}</span>
          {' · '}
          {ACCOUNT_LABELS[AccountType.CASH]}{' '}
          <span className="font-medium text-[var(--text)]">{money(cash)}</span>
        </p>
      )}
    </div>
  )
}

function IncomeSummaryCardComponent({
  summary,
  enabledAccounts = [AccountType.WHITE, AccountType.CASH],
  accountingCurrency = Currency.USD,
  amountsHidden = false,
  onToggleAmounts,
}: IncomeSummaryCardProps) {
  const showAccountBreakdown = enabledAccounts.length === 2
  const savingsColor =
    summary.savings >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'
  const savingsWithoutVariableColor =
    summary.savingsWithoutVariable >= 0
      ? 'text-[var(--green)]'
      : 'text-[var(--red)]'

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

  return (
    <section className="rounded-2xl bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-[var(--muted)]">Ahorro</p>
        {visibilityToggle}
      </div>
      <p className={`mt-1 text-4xl font-bold tabular-nums ${savingsColor}`}>
        {money(summary.savings)}
      </p>
      <p className="mt-2 text-base text-[var(--muted)]">
        Sin gastos variables{' '}
        <span className={`font-semibold ${savingsWithoutVariableColor}`}>
          {money(summary.savingsWithoutVariable)}
        </span>
      </p>

      <div className="mt-4 divide-y divide-[var(--border)] border-t border-[var(--border)]">
        <SummaryLine
          label="Ingresos"
          total={summary.totalIncome}
          white={summary.incomeWhite}
          cash={summary.incomeCash}
          showAccountBreakdown={showAccountBreakdown}
          money={money}
        />
        <SummaryLine
          label="Gastos fijos"
          total={summary.totalFixed}
          white={summary.fixedWhite}
          cash={summary.fixedCash}
          showAccountBreakdown={showAccountBreakdown}
          money={money}
        />
        <SummaryLine
          label="Gastos variables"
          total={summary.totalVariable}
          white={summary.variableWhite}
          cash={summary.variableCash}
          showAccountBreakdown={showAccountBreakdown}
          money={money}
        />
      </div>
    </section>
  )
}

export const IncomeSummaryCard = memo(IncomeSummaryCardComponent)
