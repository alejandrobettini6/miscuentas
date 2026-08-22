import { memo } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Currency } from '@/types/enums'
import { formatMoneyLabel } from '@/utils/formatters'
import { savingsCurrencySubtitle } from '@/utils/savingsFormat'

const HIDDEN_PLACEHOLDER = '••••••'

interface SavingsTotalCardProps {
  total: number
  accountingCurrency?: Currency
  amountsHidden?: boolean
  onToggleAmounts?: () => void
}

function SavingsTotalCardComponent({
  total,
  accountingCurrency = Currency.USD,
  amountsHidden = false,
  onToggleAmounts,
}: SavingsTotalCardProps) {
  const money = (amount: number) =>
    amountsHidden ? HIDDEN_PLACEHOLDER : formatMoneyLabel(amount, accountingCurrency)

  return (
    <section className="rounded-2xl bg-[var(--surface-2)] px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-[var(--muted)]">Total ahorrado</p>
        {onToggleAmounts && (
          <button
            type="button"
            className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-[var(--muted)]"
            aria-label={amountsHidden ? 'Mostrar montos' : 'Ocultar montos'}
            onClick={onToggleAmounts}
          >
            {amountsHidden ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      <p className="mt-1 text-4xl font-bold tabular-nums text-[var(--green)]">
        {money(total)}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {savingsCurrencySubtitle(accountingCurrency)}
      </p>
    </section>
  )
}

export const SavingsTotalCard = memo(SavingsTotalCardComponent)
