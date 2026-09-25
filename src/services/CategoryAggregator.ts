import { CATEGORY_LABELS, FIXED_CATEGORIES } from '@/constants/categories'
import { AccountType, Category, Currency } from '@/types/enums'
import type { CategoryRow, CombinedCategoryRow, Expense } from '@/types/models'
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
      const categoryKey = resolveCustomCategoryKey(expense.description, customCategories)
      if (!categoryKey) continue
      const key = categoryKey.toLowerCase()
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
      const label =
        fromSettings ??
        (items[0]?.description
          ? resolveCustomCategoryKey(items[0].description, customCategories)
          : null) ??
        key
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

  /** Filas por categoría con totales Blanco, Negro y combinado (vista Totales). */
  static buildCombinedRows(
    expenses: Expense[],
    customCategories: string[] = [],
    enabledFixedCategories: Category[] = FIXED_CATEGORIES,
    accountingCurrency: Currency = Currency.USD,
    rates: ExchangeRates = { usdWhite: 1, usdCash: 1 },
  ): CombinedCategoryRow[] {
    const whiteRows = this.buildRows(
      expenses,
      AccountType.WHITE,
      customCategories,
      enabledFixedCategories,
      accountingCurrency,
      rates,
    )
    const cashRows = this.buildRows(
      expenses,
      AccountType.CASH,
      customCategories,
      enabledFixedCategories,
      accountingCurrency,
      rates,
    )

    const byKey = new Map<string, CombinedCategoryRow>()

    const ensure = (row: CategoryRow) => {
      const key = combinedRowKey(row)
      if (byKey.has(key)) return
      const { totalWhite, totalCash } = this.accountTotalsForRow(
        expenses,
        row,
        accountingCurrency,
        rates,
        customCategories,
      )
      byKey.set(key, {
        category: row.category,
        description: row.description,
        label: row.label,
        isOtrosGrande: row.isOtrosGrande,
        totalWhite,
        totalCash,
        totalCombined: round(totalWhite + totalCash),
      })
    }

    for (const row of whiteRows) ensure(row)
    for (const row of cashRows) ensure(row)

    const fixedOrder: CombinedCategoryRow[] = []
    const seenFixed = new Set<string>()
    const appendFixed = (rows: CategoryRow[]) => {
      for (const row of rows) {
        if (row.isOtrosGrande) continue
        const key = combinedRowKey(row)
        if (seenFixed.has(key)) continue
        seenFixed.add(key)
        const combined = byKey.get(key)
        if (combined) fixedOrder.push(combined)
      }
    }
    appendFixed(whiteRows)
    appendFixed(cashRows)

    const grandes = [...byKey.values()]
      .filter((r) => r.isOtrosGrande)
      .sort((a, b) => b.totalCombined - a.totalCombined)

    return [...fixedOrder, ...grandes]
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

  static matchesExpenseToRow(
    expense: Expense,
    row: Pick<CategoryRow, 'category' | 'description' | 'isOtrosGrande'>,
    customCategories: string[] = [],
  ): boolean {
    return matchesRow(expense, row, customCategories)
  }

  /** Fila de categoría que contiene un gasto, o null si no encaja en ninguna. */
  static findRowForExpense(
    expense: Expense,
    rows: CategoryRow[],
    customCategories: string[] = [],
  ): CategoryRow | null {
    return (
      rows.find((row) => matchesRow(expense, row, customCategories)) ?? null
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

function resolveCustomCategoryKey(
  description: string,
  customCategories: string[],
): string | null {
  const trimmed = description.trim()
  if (!trimmed) return null

  const exact = customCategories.find(
    (c) => c.trim().toLowerCase() === trimmed.toLowerCase(),
  )
  if (exact) return exact

  const prefixed = trimmed.match(/^\(Viaje .+?\)\s+(.+)$/)
  if (prefixed) {
    const suffix = prefixed[1]!.trim()
    const fromList = customCategories.find(
      (c) => c.trim().toLowerCase() === suffix.toLowerCase(),
    )
    return fromList ?? suffix
  }

  if (trimmed.startsWith('Viaje ')) {
    return trimmed
  }

  return null
}

function isListedCustomCategory(
  description: string,
  customCategories: string[],
): boolean {
  return resolveCustomCategoryKey(description, customCategories) !== null
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
      const rowLabel = (row.description ?? '').trim().toLowerCase()
      const expenseDesc = expense.description?.trim() ?? ''
      if (!expenseDesc) return false
      const categoryKey = resolveCustomCategoryKey(expenseDesc, customCategories)
      return categoryKey?.trim().toLowerCase() === rowLabel
    }
    if (row.category === Category.OTHER && !row.isOtrosGrande) {
      return isOtrosGeneralExpense(expense, customCategories)
    }
  }
  return true
}

function combinedRowKey(
  row: Pick<CategoryRow, 'category' | 'description' | 'isOtrosGrande'>,
): string {
  return `${row.category}:${row.description ?? ''}:${row.isOtrosGrande ? '1' : '0'}`
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
