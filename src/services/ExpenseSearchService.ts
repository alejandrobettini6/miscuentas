import { AccountType, Category, Currency } from '@/types/enums'
import type { CategoryRow, Expense } from '@/types/models'
import { accountingAmount, type ExchangeRates } from './AccountingCurrency'
import { CategoryAggregator } from './CategoryAggregator'

export type ExpenseSearchResult =
  | { kind: 'category'; row: CategoryRow }
  | {
      kind: 'expense'
      row: CategoryRow
      expense: Expense
      detail: string
      amount: number
    }

export function normalizeSearchText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function expenseDetailLabel(
  row: Pick<CategoryRow, 'category' | 'description' | 'isOtrosGrande'>,
  expense: Expense,
): string | null {
  if (row.isOtrosGrande) {
    return null
  }
  if (row.category === Category.OTHER && !row.isOtrosGrande) {
    return expense.description?.trim() ? expense.description : null
  }
  return expense.description ?? 'Varios'
}

interface SearchParams {
  query: string
  rows: CategoryRow[]
  expenses: Expense[]
  accountType: AccountType
  customCategories?: string[]
  accountingCurrency?: Currency
  rates?: ExchangeRates
}

export class ExpenseSearchService {
  static search({
    query,
    rows,
    expenses,
    accountType,
    customCategories = [],
    accountingCurrency = Currency.USD,
    rates = { usdWhite: 1, usdCash: 1 },
  }: SearchParams): ExpenseSearchResult[] {
    const normalized = normalizeSearchText(query)
    if (!normalized) return []

    const categoryMatches = rows.filter((row) =>
      normalizeSearchText(row.label).includes(normalized),
    )
    if (categoryMatches.length > 0) {
      return categoryMatches.map((row) => ({ kind: 'category', row }))
    }

    const accountExpenses = expenses.filter((e) => e.accountType === accountType)
    const expenseResults: Extract<ExpenseSearchResult, { kind: 'expense' }>[] =
      []

    for (const expense of accountExpenses) {
      const row = CategoryAggregator.findRowForExpense(
        expense,
        rows,
        customCategories,
      )
      if (!row) continue

      const detail = expenseDetailLabel(row, expense)
      if (!detail) continue
      if (!normalizeSearchText(detail).includes(normalized)) continue

      expenseResults.push({
        kind: 'expense',
        row,
        expense,
        detail,
        amount: accountingAmount(
          expense,
          accountingCurrency,
          rates,
        ),
      })
    }

    expenseResults.sort(
      (a, b) =>
        new Date(b.expense.createdAt).getTime() -
        new Date(a.expense.createdAt).getTime(),
    )
    return expenseResults
  }
}
