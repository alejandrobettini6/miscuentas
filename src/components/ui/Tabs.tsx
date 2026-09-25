import { ACCOUNT_LABELS } from '@/constants/categories'
import { AccountType, type ExpenseAccountView } from '@/types/enums'

interface TabsProps {
  value: ExpenseAccountView
  onChange: (value: ExpenseAccountView) => void
  enabledAccounts?: AccountType[]
  /** Tercer segmento Totales (solo lectura); requiere Blanco y Negro habilitados. */
  showTotals?: boolean
  disabled?: boolean
}

export function Tabs({
  value,
  onChange,
  enabledAccounts = [AccountType.WHITE, AccountType.CASH],
  showTotals = false,
  disabled,
}: TabsProps) {
  if (enabledAccounts.length <= 1) {
    const only = enabledAccounts[0]
    if (!only) return null
    return (
      <div className="rounded-2xl bg-[var(--fill)] px-4 py-2.5 text-center text-sm font-semibold">
        {ACCOUNT_LABELS[only]}
      </div>
    )
  }

  const segments: { id: ExpenseAccountView; label: string }[] = enabledAccounts.map(
    (account) => ({
      id: account,
      label: ACCOUNT_LABELS[account],
    }),
  )
  if (showTotals) {
    segments.push({ id: 'TOTALS', label: 'Totales' })
  }

  return (
    <div
      className="grid gap-1 rounded-2xl bg-[var(--fill)] p-1"
      style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }}
      role="tablist"
      aria-label="Cuenta"
    >
      {segments.map((segment) => {
        const active = value === segment.id
        return (
          <button
            key={segment.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={segment.label}
            disabled={disabled}
            className={`min-h-10 rounded-xl text-sm font-semibold transition ${
              active
                ? 'bg-[var(--segment-active)] text-[var(--text)] shadow-sm'
                : 'text-[var(--muted)]'
            }`}
            onClick={() => onChange(segment.id)}
          >
            {segment.label}
          </button>
        )
      })}
    </div>
  )
}
