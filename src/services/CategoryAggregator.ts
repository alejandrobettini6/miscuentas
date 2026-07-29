import { CATEGORY_LABELS, FIXED_CATEGORIES } from '@/constants/categories'
import { AccountType, Category, Currency } from '@/types/enums'
import type { CategoryRow, Expense } from '@/types/models'
import { accountingAmount, type ExchangeRates } from './AccountingCurrency'

export class CategoryAggregator {
  static buildRows(
    expenses: Expense[],
    accountType: AccountType,
    customCategories: string[] = [],
    enabledFixedCategories: Category[] = FIXED_CATEGORIES,
    accountingCurrency: Currency = Currency.USD,
    rates: ExchangeRates = { usdWhite: 1, usdCash: 1 },
  ): CategoryRow[] {
    const accountExpenses = expenses.filter((e) => e.accountType === accountType)
    const rows: CategoryRow[] = []
    const enabledFixed = new Set(enabledFixedCategories)

    for (const category of FIXED_CATEGORIES) {
      if (!enabledFixed.has(category)) continue
      const items = accountExpenses.filter((e) => e.category === category)
      rows.push(buildFixedRow(category, items, accountingCurrency, rates))
    }

    const otherGeneral = accountExpenses.filter((e) =>
      isOtrosGeneralExpense(e, customCategories),
    )
    rows.push(buildFixedRow(Category.OTHER, otherGeneral, accountingCurrency, rates))

    const grandesMap = new Map<string, Expense[]>()
    for (const expense of accountExpenses) {
      if (expense.category !== Category.OTHER || !expense.description) continue
      if (!isListedCustomCategory(expense.description, customCategories)) continue
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

    const grandesRows: CategoryRow[] = []
    for (const [key, items] of grandesMap.entries()) {
      const fromSettings = customCategories.find((c) => c.toLowerCase() === key)
      const label = items[0]?.description ?? fromSettings ?? key
      const totalUsd = round(
        items.reduce((acc, e) => acc + accountingAmount(e, accountingCurrency, rates), 0),
      )
      const lastExpense = latest(items)
      grandesRows.push({
        category: Category.OTHER,
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

  /** Gastos de una fila de categoría (cuenta activa). */
  static expensesForRow(
    expenses: Expense[],
    accountType: AccountType,
    row: Pick<CategoryRow, 'category' | 'description' | 'isOtrosGrande'>,
    customCategories: string[] = [],
  ): Expense[] {
    return expenses
      .filter((e) => e.accountType === accountType)
      .filter((e) => matchesRow(e, row, customCategories))
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
  }

  /** Totales Blanco/Negro de una categoría específica (ambas cuentas). */
  static accountTotalsForRow(
    expenses: Expense[],
    row: Pick<CategoryRow, 'category' | 'description' | 'isOtrosGrande'>,
    accountingCurrency: Currency = Currency.USD,
    rates: ExchangeRates = { usdWhite: 1, usdCash: 1 },
    customCategories: string[] = [],
  ): { totalWhite: number; totalCash: number } {
    const matched = expenses.filter((e) => matchesRow(e, row, customCategories))
    return {
      totalWhite: round(
        matched
          .filter((e) => e.accountType === AccountType.WHITE)
          .reduce((acc, e) => acc + accountingAmount(e, accountingCurrency, rates), 0),
      ),
      totalCash: round(
        matched
          .filter((e) => e.accountType === AccountType.CASH)
          .reduce((acc, e) => acc + accountingAmount(e, accountingCurrency, rates), 0),
      ),
    }
  }
}

function isListedCustomCategory(
  description: string,
  customCategories: string[],
): boolean {
  const lower = description.trim().toLowerCase()
  return customCategories.some((c) => c.trim().toLowerCase() === lower)
}

function isOtrosGeneralExpense(
  expense: Expense,
  customCategories: string[],
): boolean {
  if (expense.category !== Category.OTHER) return false
  if (!expense.description) return true
  return !isListedCustomCategory(expense.description, customCategories)
}

function matchesRow(
  expense: Expense,
  row: Pick<CategoryRow, 'category' | 'description' | 'isOtrosGrande'>,
  customCategories: string[],
): boolean {
  if (expense.category !== row.category) return false
  if (row.isOtrosGrande || row.category === Category.OTHER) {
    if (row.isOtrosGrande) {
      return (
        Boolean(expense.description) &&
        expense.description!.toLowerCase() === (row.description ?? '').toLowerCase()
      )
    }
    if (row.category === Category.OTHER && !row.isOtrosGrande) {
      return isOtrosGeneralExpense(expense, customCategories)
    }
  }
  return true
}

function buildFixedRow(
  category: Category,
  items: Expense[],
  accountingCurrency: Currency,
  rates: ExchangeRates,
): CategoryRow {
  return {
    category,
    description: null,
    label: CATEGORY_LABELS[category],
    totalUsd: round(
      items.reduce((acc, e) => acc + accountingAmount(e, accountingCurrency, rates), 0),
    ),
    lastExpense: latest(items),
    isOtrosGrande: false,
  }
}

function latest(items: Expense[]): Expense | null {
  if (items.length === 0) return null
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0] ?? null
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
