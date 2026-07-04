import { ACCOUNT_LABELS } from '@/constants/categories'
import { AccountType } from '@/types/enums'

interface TabsProps {
  value: AccountType
  onChange: (value: AccountType) => void
  disabled?: boolean
}

export function Tabs({ value, onChange, disabled }: TabsProps) {
  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-2xl bg-[#e5e5ea] p-1"
      role="tablist"
      aria-label="Cuenta"
    >
      {[AccountType.WHITE, AccountType.CASH].map((account) => {
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
