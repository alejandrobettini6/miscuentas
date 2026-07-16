import { ACCOUNT_LABELS } from '@/constants/categories'
import { AccountType } from '@/types/enums'

interface TabsProps {
  value: AccountType
  onChange: (value: AccountType) => void
  enabledAccounts?: AccountType[]
  disabled?: boolean
}

export function Tabs({
  value,
  onChange,
  enabledAccounts = [AccountType.WHITE, AccountType.CASH],
  disabled,
}: TabsProps) {
  if (enabledAccounts.length <= 1) {
    const only = enabledAccounts[0]
    if (!only) return null
    return (
      <div className="rounded-2xl bg-[#e5e5ea] px-4 py-3 text-center text-base font-semibold">
        {ACCOUNT_LABELS[only]}
      </div>
    )
  }

  return (
    <div
      className="grid gap-1 rounded-2xl bg-[#e5e5ea] p-1"
      style={{ gridTemplateColumns: `repeat(${enabledAccounts.length}, minmax(0, 1fr))` }}
      role="tablist"
      aria-label="Cuenta"
    >
      {enabledAccounts.map((account) => {
        const active = value === account
        return (
          <button
            key={account}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={ACCOUNT_LABELS[account]}
            disabled={disabled}
            className={`min-h-11 rounded-xl text-base font-semibold transition ${
              active ? 'bg-white text-[var(--text)] shadow-sm' : 'text-[var(--muted)]'
            }`}
            onClick={() => onChange(account)}
          >
            {ACCOUNT_LABELS[account]}
          </button>
        )
      })}
    </div>
  )
}
