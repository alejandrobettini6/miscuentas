import { CATEGORY_LABELS, FIXED_CATEGORIES } from '@/constants/categories'
import { Category } from '@/types/enums'
import type { AccountType } from '@/types/enums'
import type { CategoryRow, Expense } from '@/types/models'

export class CategoryAggregator {
  static buildRows(expenses: Expense[], accountType: AccountType): CategoryRow[] {
    const accountExpenses = expenses.filter((e) => e.accountType === accountType)
    const rows: CategoryRow[] = []

    for (const category of FIXED_CATEGORIES) {
      const items = accountExpenses.filter((e) => e.category === category)
      rows.push(buildFixedRow(category, items))
    }

    const otherGeneral = accountExpenses.filter(
      (e) => e.category === Category.OTHER && !e.description,
    )
    rows.push(buildFixedRow(Category.OTHER, otherGeneral))

    const grandesMap = new Map<string, Expense[]>()
    for (const expense of accountExpenses) {
      if (expense.category !== Category.OTHER || !expense.description) continue
      const key = expense.description.toLowerCase()
      const list = grandesMap.get(key) ?? []
      list.push(expense)
      grandesMap.set(key, list)
    }

    const grandesRows: CategoryRow[] = []
    for (const items of grandesMap.values()) {
      const label = items[0]?.description ?? ''
      const totalUsd = round(items.reduce((acc, e) => acc + e.usdAmount, 0))
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
}

function buildFixedRow(category: Category, items: Expense[]): CategoryRow {
  return {
    category,
    description: null,
    label: CATEGORY_LABELS[category],
    totalUsd: round(items.reduce((acc, e) => acc + e.usdAmount, 0)),
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
