import { TRIP_OTHER_CATEGORY, getTripCategoryLabel } from '@/constants/tripCategories'
import type { AccountType, Currency } from '@/types/enums'
import type { TripCategoryRow, TripExpense } from '@/types/models'
import { accountingAmountFromRecord, type ExchangeRates } from './AccountingCurrency'

export class TripCategoryAggregator {
  static buildRows(
    expenses: TripExpense[],
    accountType: AccountType,
    enabledCategories: string[],
    customCategories: string[] = [],
    accountingCurrency: Currency,
    rates: ExchangeRates,
  ): TripCategoryRow[] {
    const accountExpenses = expenses.filter((e) => e.accountType === accountType)
    const rows: TripCategoryRow[] = []

    for (const category of enabledCategories) {
      if (category === TRIP_OTHER_CATEGORY) continue
      const items = accountExpenses.filter((e) => e.category === category)
      rows.push(buildFixedRow(category, items, accountingCurrency, rates))
    }

    const otherGeneral = accountExpenses.filter((e) =>
      isOtherGeneral(e, customCategories),
    )
    rows.push(buildFixedRow(TRIP_OTHER_CATEGORY, otherGeneral, accountingCurrency, rates))

    const grandesMap = new Map<string, TripExpense[]>()
    for (const expense of accountExpenses) {
      if (expense.category !== TRIP_OTHER_CATEGORY || !expense.description) continue
      if (!isListedCustom(expense.description, customCategories)) continue
      const key = expense.description.toLowerCase()
      const list = grandesMap.get(key) ?? []
      list.push(expense)
      grandesMap.set(key, list)
    }

    for (const name of customCategories) {
      const trimmed = name.trim()
      if (!trimmed) continue
      const key = trimmed.toLowerCase()
      if (!grandesMap.has(key)) {
        grandesMap.set(key, [])
      }
    }

    const grandesRows: TripCategoryRow[] = []
    for (const [key, items] of grandesMap.entries()) {
      const fromSettings = customCategories.find((c) => c.toLowerCase() === key)
      const label = items[0]?.description ?? fromSettings ?? key
      const totalUsd = round(
        items.reduce((acc, e) => acc + accountingAmountFromRecord(e, accountingCurrency, rates), 0),
      )
      const lastExpense = latest(items)
      grandesRows.push({
        category: TRIP_OTHER_CATEGORY,
        description: label,
        label,
        totalUsd,
        lastExpense,
        isOtrosGrande: true,
      })
    }

    grandesRows.sort((a, b) => b.totalUsd - a.totalUsd)
    return [...rows, ...grandesRows]
  }

  static expensesForRow(
    expenses: TripExpense[],
    accountType: AccountType,
    row: Pick<TripCategoryRow, 'category' | 'description' | 'isOtrosGrande'>,
    customCategories: string[] = [],
  ): TripExpense[] {
    return expenses
      .filter((e) => e.accountType === accountType)
      .filter((e) => matchesRow(e, row, customCategories))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  static accountTotalsForRow(
    expenses: TripExpense[],
    row: Pick<TripCategoryRow, 'category' | 'description' | 'isOtrosGrande'>,
    accountingCurrency: Currency,
    rates: ExchangeRates,
    customCategories: string[] = [],
  ): { totalWhite: number; totalCash: number } {
    const matched = expenses.filter((e) => matchesRow(e, row, customCategories))
    return {
      totalWhite: round(
        matched
          .filter((e) => e.accountType === 'WHITE')
          .reduce((acc, e) => acc + accountingAmountFromRecord(e, accountingCurrency, rates), 0),
      ),
      totalCash: round(
        matched
          .filter((e) => e.accountType === 'CASH')
          .reduce((acc, e) => acc + accountingAmountFromRecord(e, accountingCurrency, rates), 0),
      ),
    }
  }
}

function isListedCustom(description: string, customCategories: string[]): boolean {
  const lower = description.trim().toLowerCase()
  return customCategories.some((c) => c.trim().toLowerCase() === lower)
}

function isOtherGeneral(expense: TripExpense, customCategories: string[]): boolean {
  if (expense.category !== TRIP_OTHER_CATEGORY) return false
  if (!expense.description) return true
  return !isListedCustom(expense.description, customCategories)
}

function matchesRow(
  expense: TripExpense,
  row: Pick<TripCategoryRow, 'category' | 'description' | 'isOtrosGrande'>,
  customCategories: string[],
): boolean {
  if (expense.category !== row.category) return false
  if (row.isOtrosGrande) {
    return (
      Boolean(expense.description) &&
      expense.description!.toLowerCase() === (row.description ?? '').toLowerCase()
    )
  }
  if (row.category === TRIP_OTHER_CATEGORY) {
    return isOtherGeneral(expense, customCategories)
  }
  return true
}

function buildFixedRow(
  category: string,
  items: TripExpense[],
  accountingCurrency: Currency,
  rates: ExchangeRates,
): TripCategoryRow {
  return {
    category,
    description: null,
    label: getTripCategoryLabel(category),
    totalUsd: round(
      items.reduce((acc, e) => acc + accountingAmountFromRecord(e, accountingCurrency, rates), 0),
    ),
    lastExpense: latest(items),
    isOtrosGrande: false,
  }
}

function latest(items: TripExpense[]): TripExpense | null {
  if (items.length === 0) return null
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0] ?? null
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
