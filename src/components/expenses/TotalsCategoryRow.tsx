import { memo } from 'react'
import { ACCOUNT_LABELS } from '@/constants/categories'
import { AccountType, Currency } from '@/types/enums'
import type { CombinedCategoryRow } from '@/types/models'
import { formatMoneyLabel } from '@/utils/formatters'

const HIDDEN_PLACEHOLDER = '••••••'

interface TotalsCategoryRowProps {
  row: CombinedCategoryRow
  accountingCurrency?: Currency
  amountsHidden?: boolean
}

function TotalsCategoryRowComponent({
  row,
  accountingCurrency = Currency.USD,
  amountsHidden = false,
}: TotalsCategoryRowProps) {
  const money = (amount: number) =>
    amountsHidden ? HIDDEN_PLACEHOLDER : formatMoneyLabel(amount, accountingCurrency)

  return (
    <div
      className="border-b border-[var(--border)] py-3"
      role="listitem"
      aria-label={`${row.label}, total ${money(row.totalCombined)}`}
    >
      <div className="flex items-baseline justify-between gap-3 px-1">
        <span className="text-lg font-medium">{row.label}</span>
        <span className="text-lg font-semibold tabular-nums">
          {money(row.totalCombined)}
        </span>
      </div>
      <p className="mt-1 px-1 text-sm text-[var(--muted)] tabular-nums">
        {ACCOUNT_LABELS[AccountType.WHITE]} {money(row.totalWhite)}
        {' · '}
        {ACCOUNT_LABELS[AccountType.CASH]} {money(row.totalCash)}
      </p>
    </div>
  )
}

export const TotalsCategoryRow = memo(TotalsCategoryRowComponent)
