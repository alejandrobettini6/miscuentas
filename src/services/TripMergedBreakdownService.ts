import { getTripCategoryLabel } from '@/constants/tripCategories'
import { AccountType, Currency, TripMergeMode } from '@/types/enums'
import type { CategoryRow, Trip, TripExpense } from '@/types/models'
import {
  accountingAmountFromRecord,
  type ExchangeRates,
} from './AccountingCurrency'
import { tripAsCategoryLabel } from './TripCategoryMapper'

export interface TripCategoryBreakdownItem {
  label: string
  total: number
  totalWhite: number
  totalCash: number
}

export function findMergedTripForCategoryRow(
  row: Pick<CategoryRow, 'label' | 'isOtrosGrande'>,
  trips: Trip[],
): Trip | null {
  if (!row.isOtrosGrande) return null
  const rowLabel = row.label.trim().toLowerCase()
  return (
    trips.find(
      (trip) =>
        Boolean(trip.mergedAt) &&
        trip.mergeMode === TripMergeMode.AS_TRIP &&
        tripAsCategoryLabel(trip.name).trim().toLowerCase() === rowLabel,
    ) ?? null
  )
}

export function buildCategoryBreakdown(
  tripExpenses: TripExpense[],
  accountingCurrency: Currency,
  rates: ExchangeRates,
): TripCategoryBreakdownItem[] {
  const totals = new Map<
    string,
    { label: string; total: number; totalWhite: number; totalCash: number }
  >()

  for (const expense of tripExpenses) {
    const label = getTripCategoryLabel(expense.category)
    const key = label.trim().toLowerCase()
    const amount = accountingAmountFromRecord(expense, accountingCurrency, rates)
    const entry = totals.get(key) ?? {
      label,
      total: 0,
      totalWhite: 0,
      totalCash: 0,
    }
    entry.total += amount
    if (expense.accountType === AccountType.WHITE) {
      entry.totalWhite += amount
    } else {
      entry.totalCash += amount
    }
    totals.set(key, entry)
  }

  return [...totals.values()]
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total)
}
