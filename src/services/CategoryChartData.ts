import { resolveCategoryChartColor } from '@/constants/categories'
import { Category } from '@/types/enums'

export const CATEGORY_CHART_TOP_N = 6

export const REST_SLICE_KEY = '__rest__'

export interface CategoryChartInputRow {
  label: string
  category: Category
  description?: string | null
  isOtrosGrande: boolean
  amount: number
}

export interface CategoryChartSlice {
  key: string
  label: string
  category: Category
  description?: string | null
  isOtrosGrande: boolean
  amount: number
  percent: number
  color: string
}

function chartRowKey(row: CategoryChartInputRow): string {
  if (row.category === Category.OTHER && row.isOtrosGrande) {
    return `other:${row.label.trim().toLowerCase()}`
  }
  return row.category
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10
}

export function buildCategoryChartSlices(
  rows: CategoryChartInputRow[],
): CategoryChartSlice[] {
  const positive = rows
    .filter((row) => row.amount > 0)
    .slice()
    .sort((a, b) => b.amount - a.amount)

  if (positive.length === 0) return []

  const top = positive.slice(0, CATEGORY_CHART_TOP_N)
  const restAmount = positive
    .slice(CATEGORY_CHART_TOP_N)
    .reduce((acc, row) => acc + row.amount, 0)

  const displayRows: (CategoryChartInputRow & { chartKey: string })[] = top.map(
    (row) => ({
      ...row,
      chartKey: chartRowKey(row),
    }),
  )

  if (restAmount > 0) {
    displayRows.push({
      label: 'Resto',
      category: Category.OTHER,
      isOtrosGrande: false,
      amount: restAmount,
      chartKey: REST_SLICE_KEY,
    })
  }

  const total = displayRows.reduce((acc, row) => acc + row.amount, 0)
  if (total <= 0) return []

  return displayRows.map((row) => ({
    key: row.chartKey,
    label: row.label,
    category: row.category,
    description: row.description,
    isOtrosGrande: row.isOtrosGrande,
    amount: row.amount,
    percent: roundPercent((row.amount / total) * 100),
    color: resolveCategoryChartColor(row),
  }))
}
