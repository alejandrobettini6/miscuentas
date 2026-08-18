import { CATEGORY_LABELS, FIXED_CATEGORIES } from '@/constants/categories'
import { getTripCategoryLabel, TRIP_OTHER_CATEGORY } from '@/constants/tripCategories'
import { Category } from '@/types/enums'
import type { Settings, Trip, TripExpense } from '@/types/models'

export interface ResolvedMergeExpense {
  category: Category
  description: string | null
  newCustomCategories: string[]
}

const CATEGORY_VALUES = new Set<string>(Object.values(Category))

function findCustomMatch(
  name: string,
  customCategories: string[],
): string | undefined {
  const lower = name.trim().toLowerCase()
  return customCategories.find((c) => c.trim().toLowerCase() === lower)
}

function tripPrefix(tripName: string): string {
  return `(Viaje ${tripName})`
}

function buildPrefixedDetail(tripName: string, detail: string | null | undefined): string | null {
  const prefix = tripPrefix(tripName)
  const trimmed = detail?.trim()
  if (!trimmed) return prefix.slice(0, 40)
  const combined = `${prefix} ${trimmed}`.trim()
  return combined.slice(0, 40)
}

/**
 * Resuelve cómo mapear un gasto de viaje a un expense mensual en fusión individual.
 */
export function resolveTripExpenseForMerge(
  trip: Trip,
  expense: TripExpense,
  settings: Settings,
  pendingNewCategories: string[],
): ResolvedMergeExpense {
  const allCustom = [...settings.customCategories, ...pendingNewCategories]
  const tripCategory = expense.category

  if (tripCategory === TRIP_OTHER_CATEGORY) {
    const desc = expense.description?.trim()
    if (desc) {
      const tripCustom = findCustomMatch(desc, trip.customCategories)
      if (tripCustom) {
        const existing = findCustomMatch(tripCustom, allCustom)
        const label = existing ?? tripCustom
        const newCustomCategories =
          existing || pendingNewCategories.some((c) => c.toLowerCase() === label.toLowerCase())
            ? []
            : [label]
        return {
          category: Category.OTHER,
          description: buildPrefixedDetail(trip.name, label),
          newCustomCategories,
        }
      }
    }
    return {
      category: Category.OTHER,
      description: buildPrefixedDetail(trip.name, expense.description),
      newCustomCategories: [],
    }
  }

  if (CATEGORY_VALUES.has(tripCategory)) {
    const fixed = tripCategory as Category
    if (
      fixed !== Category.OTHER &&
      settings.enabledFixedCategories.includes(fixed)
    ) {
      return {
        category: fixed,
        description: buildPrefixedDetail(trip.name, expense.description),
        newCustomCategories: [],
      }
    }
  }

  const label = getTripCategoryLabel(tripCategory)
  const fixedLabelMatch = FIXED_CATEGORIES.find(
    (cat) => CATEGORY_LABELS[cat].toLowerCase() === label.toLowerCase(),
  )
  if (
    fixedLabelMatch &&
    fixedLabelMatch !== Category.OTHER &&
    settings.enabledFixedCategories.includes(fixedLabelMatch)
  ) {
    return {
      category: fixedLabelMatch,
      description: buildPrefixedDetail(trip.name, expense.description),
      newCustomCategories: [],
    }
  }

  const existingCustom =
    findCustomMatch(tripCategory, allCustom) ??
    findCustomMatch(label, allCustom) ??
    findCustomMatch(tripCategory, trip.customCategories) ??
    findCustomMatch(label, trip.customCategories)

  const customName = existingCustom ?? label
  const newCustomCategories =
    existingCustom ||
    pendingNewCategories.some((c) => c.toLowerCase() === customName.toLowerCase())
      ? []
      : [customName]

  return {
    category: Category.OTHER,
    description: buildPrefixedDetail(trip.name, customName),
    newCustomCategories,
  }
}

export function tripAsCategoryLabel(tripName: string): string {
  return `Viaje ${tripName}`
}
