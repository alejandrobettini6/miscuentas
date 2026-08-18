import { Category } from '@/types/enums'
import type { Expense, Trip } from '@/types/models'
import { tripAsCategoryLabel } from './TripCategoryMapper'

export function collectMergedExpenseIds(trips: Trip[]): Set<string> {
  const ids = new Set<string>()
  for (const trip of trips) {
    if (!trip.mergedAt || !trip.mergedExpenseIds) continue
    for (const id of trip.mergedExpenseIds) {
      ids.add(id)
    }
  }
  return ids
}

export function isMergedExpense(expenseId: string, mergedIds: Set<string>): boolean {
  return mergedIds.has(expenseId)
}

/**
 * Custom categories que pueden eliminarse tras revertir la fusión de un viaje.
 */
export function customCategoriesToRemoveAfterRevert(
  trip: Trip,
  allExpenses: Expense[],
  mergedExpenseIds: string[],
): string[] {
  const mergedSet = new Set(mergedExpenseIds)
  const remaining = allExpenses.filter((e) => !mergedSet.has(e.id))
  const toRemove = new Set<string>()

  if (trip.mergeMode === 'AS_TRIP') {
    const label = tripAsCategoryLabel(trip.name)
    const stillUsed = remaining.some(
      (e) =>
        e.category === Category.OTHER &&
        e.description?.trim().toLowerCase() === label.toLowerCase(),
    )
    if (!stillUsed) toRemove.add(label)
    return [...toRemove]
  }

  for (const expense of allExpenses) {
    if (!mergedSet.has(expense.id)) continue
    if (expense.category !== Category.OTHER || !expense.description) continue

    const desc = expense.description.trim()
    const stillUsed = remaining.some(
      (e) =>
        e.category === Category.OTHER &&
        e.description?.trim().toLowerCase() === desc.toLowerCase(),
    )
    if (!stillUsed) toRemove.add(desc)
  }

  return [...toRemove]
}
