import { useMemo } from 'react'
import { useSettingsContext } from '@/contexts/SettingsContext'
import { FIXED_CATEGORIES } from '@/constants/categories'
import { resolveAccountingCurrency } from '@/services/AccountingCurrency'
import { CategoryAggregator } from '@/services/CategoryAggregator'
import { SummaryCalculator } from '@/services/SummaryCalculator'
import { Currency, type AccountType } from '@/types/enums'
import type { Expense } from '@/types/models'

export function useSummary(expenses: Expense[], accountType: AccountType) {
  const { settings } = useSettingsContext()

  return useMemo(() => {
    const monthlyLimit = settings?.monthlyLimit ?? 0
    const customCategories = settings?.customCategories ?? []
    const enabledFixed = settings?.enabledFixedCategories ?? FIXED_CATEGORIES
    const accountingCurrency = settings
      ? resolveAccountingCurrency(settings)
      : Currency.USD
    const summary = SummaryCalculator.calculate(
      expenses,
      monthlyLimit,
      accountingCurrency,
    )
    const color = SummaryCalculator.resolveBudgetColor(
      summary.remainingPercent,
      summary.available,
    )
    const progress = SummaryCalculator.progressRatio(
      summary.available,
      monthlyLimit,
    )
    const rows = CategoryAggregator.buildRows(
      expenses,
      accountType,
      customCategories,
      enabledFixed,
      accountingCurrency,
    )

    return { summary, color, progress, rows, accountingCurrency }
  }, [
    expenses,
    settings,
    accountType,
  ])
}
