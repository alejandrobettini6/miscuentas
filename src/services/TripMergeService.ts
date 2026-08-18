import { AccountType, Category } from '@/types/enums'
import type { CreateExpenseInput, Period, Settings, Trip, TripExpense } from '@/types/models'
import { getYearMonthKey } from '@/utils/date'
import {
  accountingAmountFromRecord,
  resolveAccountingCurrency,
  type ExchangeRates,
} from './AccountingCurrency'
import { CurrencyConverter } from './CurrencyConverter'
import {
  resolveTripExpenseForMerge,
  tripAsCategoryLabel,
} from './TripCategoryMapper'

export type MergeDestination = 'by_date' | 'current_month'

export interface MergeBuildResult {
  inputs: CreateExpenseInput[]
  missingMonths: string[]
  newCategories: string[]
}

export class TripMergeService {
  static groupByMonth(expenses: TripExpense[]): Map<string, TripExpense[]> {
    const groups = new Map<string, TripExpense[]>()
    for (const expense of expenses) {
      const ym = getYearMonthKey(new Date(expense.createdAt))
      const list = groups.get(ym) ?? []
      list.push(expense)
      groups.set(ym, list)
    }
    return groups
  }

  /**
   * Fusiona todos los gastos del viaje en totales por (periodo, cuenta)
   * bajo la categoría custom "Viaje {nombre}".
   */
  static buildAsTripInputs(
    trip: Trip,
    expenses: TripExpense[],
    destination: MergeDestination,
    activePeriodId: string,
    periods: Period[],
    settings: Settings,
  ): MergeBuildResult {
    const label = tripAsCategoryLabel(trip.name)
    const accountingCurrency = resolveAccountingCurrency(settings)
    const rates: ExchangeRates = {
      usdWhite: settings.usdWhite,
      usdCash: settings.usdCash,
    }

    const totals = new Map<string, number>()
    const accountByKey = new Map<string, AccountType>()
    const missingMonths: string[] = []

    for (const expense of expenses) {
      const periodId = resolvePeriodId(
        expense,
        destination,
        activePeriodId,
        periods,
        missingMonths,
      )
      const key = `${periodId}:${expense.accountType}`
      const amount = accountingAmountFromRecord(expense, accountingCurrency, rates)
      totals.set(key, (totals.get(key) ?? 0) + amount)
      accountByKey.set(key, expense.accountType)
    }

    const inputs: CreateExpenseInput[] = []
    for (const [key, total] of totals.entries()) {
      const rounded = CurrencyConverter.roundMoney(total)
      if (rounded <= 0) continue

      const [periodId, accountRaw] = key.split(':')
      inputs.push({
        periodId: periodId!,
        accountType: accountRaw as AccountType,
        category: Category.OTHER,
        description: label,
        originalCurrency: accountingCurrency,
        originalAmount: rounded,
      })
    }

    const existingLower = settings.customCategories.map((c) => c.toLowerCase())
    const newCategories = existingLower.includes(label.toLowerCase()) ? [] : [label]

    return { inputs, missingMonths, newCategories }
  }

  /**
   * Fusiona gastos individualmente mapeando cada categoría de viaje
   * a la categoría mensual correspondiente.
   */
  static buildIndividualInputs(
    trip: Trip,
    expenses: TripExpense[],
    destination: MergeDestination,
    activePeriodId: string,
    periods: Period[],
    settings: Settings,
  ): MergeBuildResult {
    const inputs: CreateExpenseInput[] = []
    const missingMonths: string[] = []
    const pendingNewCategories: string[] = []

    for (const expense of expenses) {
      const resolved = resolveTripExpenseForMerge(
        trip,
        expense,
        settings,
        pendingNewCategories,
      )

      for (const name of resolved.newCustomCategories) {
        if (
          !pendingNewCategories.some((c) => c.toLowerCase() === name.toLowerCase()) &&
          !settings.customCategories.some((c) => c.toLowerCase() === name.toLowerCase())
        ) {
          pendingNewCategories.push(name)
        }
      }

      inputs.push({
        periodId: resolvePeriodId(
          expense,
          destination,
          activePeriodId,
          periods,
          missingMonths,
        ),
        accountType: expense.accountType,
        category: resolved.category,
        description: resolved.description,
        originalCurrency: expense.originalCurrency,
        originalAmount: expense.originalAmount,
      })
    }

    return { inputs, missingMonths, newCategories: pendingNewCategories }
  }
}

function resolvePeriodId(
  expense: TripExpense,
  destination: MergeDestination,
  activePeriodId: string,
  periods: Period[],
  missingMonths: string[],
): string {
  if (destination === 'current_month') return activePeriodId

  const periodsByMonth = new Map(periods.map((p) => [p.yearMonth, p]))
  const ym = getYearMonthKey(new Date(expense.createdAt))
  const period = periodsByMonth.get(ym)
  if (period) return period.id

  if (!missingMonths.includes(ym)) missingMonths.push(ym)
  return activePeriodId
}
