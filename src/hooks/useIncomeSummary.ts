import { useMemo } from 'react'
import { FIXED_CATEGORIES } from '@/constants/categories'
import { useSettingsContext } from '@/contexts/SettingsContext'
import {
  resolveAccountingCurrency,
  type ExchangeRates,
} from '@/services/AccountingCurrency'
import { IncomeSummaryCalculator } from '@/services/IncomeSummaryCalculator'
import { Currency } from '@/types/enums'
import type { Expense, Income } from '@/types/models'

export function useIncomeSummary(incomes: Income[], expenses: Expense[]) {
  const { settings } = useSettingsContext()

  return useMemo(() => {
    const accountingCurrency = settings
      ? resolveAccountingCurrency(settings)
      : Currency.USD
    const rates: ExchangeRates = {
      usdWhite: settings?.usdWhite ?? 1,
      usdCash: settings?.usdCash ?? 1,
    }
    const enabledFixed = settings?.enabledFixedCategories ?? FIXED_CATEGORIES

    return IncomeSummaryCalculator.calculate(
      incomes,
      expenses,
      enabledFixed,
      accountingCurrency,
      rates,
    )
  }, [incomes, expenses, settings])
}
