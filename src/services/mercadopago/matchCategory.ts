import { CATEGORY_LABELS } from '@/constants/categories'
import { Category } from '@/types/enums'

const KEYWORDS: Partial<Record<Category, string[]>> = {
  [Category.SUPER]: [
    'carrefour',
    'coto',
    'disco',
    'jumbo',
    'vea',
    'dia',
    'supermercado',
    'super',
    'atomo',
    'la anonima',
    'changomas',
    'makro',
    'walmart',
    'mason',
  ],
  [Category.DELIVERY]: [
    'rappi',
    'pedidosya',
    'pedidos ya',
    'mcdonald',
    'burger',
    'mostaza',
    'kfc',
  ],
  [Category.SALUD]: [
    'farmacity',
    'farmacia',
    'dr ahorro',
    'simplicity',
    'osde',
    'swiss medical',
  ],
  [Category.AUTO]: ['ypf', 'shell', 'axion', 'puma', 'estacion de servicio'],
  [Category.SERVICIOS]: [
    'edesur',
    'edenor',
    'metrogas',
    'naturgy',
    'aysa',
    'telecom',
    'personal',
    'claro',
    'movistar',
    'fibertel',
    'iplan',
  ],
  [Category.SALIDAS]: ['starbucks', 'restaurante', 'cinemark', 'cine'],
  [Category.GYM]: ['gym', 'sportclub', 'megatlon', 'smart fit'],
  [Category.PELO]: ['peluqueria'],
  [Category.TAXES]: ['arba', 'afip', 'rentas', 'monotributo'],
}

export interface CategoryMatch {
  category: Category
  /** Nombre de categoría personalizada cuando category es OTHER. */
  customName: string | null
}

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function hasToken(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack)
}

/**
 * Un valor explícito del pago: el id de categoría, su nombre en español
 * o una palabra que ya conocemos. Si no cierra, no adivina.
 */
export function matchCategorySignal(
  value: string,
  enabledFixed: Category[],
  customCategories: string[],
): CategoryMatch | null {
  const folded = fold(value.trim())
  if (!folded) return null

  for (const category of enabledFixed) {
    const label = CATEGORY_LABELS[category]
    if (fold(category) === folded || fold(label) === folded) {
      return { category, customName: null }
    }
  }

  const custom = customCategories.find((name) => fold(name.trim()) === folded)
  if (custom && folded.length >= 3) {
    return { category: Category.OTHER, customName: custom.trim() }
  }

  return matchExpenseCategory(value, enabledFixed, customCategories)
}

/**
 * Una sola categoría clara. Si hay más de una, o ninguna, no adivina.
 */
export function matchExpenseCategory(
  merchant: string,
  enabledFixed: Category[],
  customCategories: string[],
): CategoryMatch | null {
  const haystack = fold(merchant)
  if (!haystack) return null

  const fixedHits: Category[] = []
  for (const category of enabledFixed) {
    if (category === Category.OTHER || category === Category.REFUNDS) continue
    const words = KEYWORDS[category] ?? []
    if (words.some((word) => hasToken(haystack, fold(word)))) {
      fixedHits.push(category)
    }
  }

  const customHits = customCategories.filter((name) => {
    const folded = fold(name.trim())
    return folded.length >= 3 && hasToken(haystack, folded)
  })

  if (fixedHits.length + customHits.length !== 1) return null
  if (fixedHits.length === 1) {
    return { category: fixedHits[0]!, customName: null }
  }
  return { category: Category.OTHER, customName: customHits[0]!.trim() }
}
