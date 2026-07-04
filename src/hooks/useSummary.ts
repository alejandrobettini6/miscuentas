import { useMemo } from 'react'
import { useSettingsContext } from '@/contexts/SettingsContext'
import { CategoryAggregator } from '@/services/CategoryAggregator'
import { SummaryCalculator } from '@/services/SummaryCalculator'
import type { AccountType } from '@/types/enums'
import type { Expense } from '@/types/models'

export function useSummary(expenses: Expense[], accountType: AccountType) {
  const { settings } = useSettingsContext()

  return useMemo(() => {
    const monthlyLimit = settings?.monthlyLimit ?? 0
    const summary = SummaryCalculator.calculate(expenses, monthlyLimit)
    const color = SummaryCalculator.resolveBudgetColor(
      summary.remainingPercent,
      summary.available,
    )
    const progress = SummaryCalculator.progressRatio(
      summary.available,
      monthlyLimit,
    )
    const rows = CategoryAggregator.buildRows(expenses, accountType)

    return { summary, color, progress, rows }
  }, [expenses, settings?.monthlyLimit, accountType])
}
