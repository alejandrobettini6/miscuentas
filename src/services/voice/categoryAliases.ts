import { CATEGORY_LABELS } from '@/constants/categories'
import { Category } from '@/types/enums'
import { normalizeSearchText } from '@/services/ExpenseSearchService'

const EXTRA_ALIASES: Record<string, Category> = {
  gimnasio: Category.GYM,
  gimnasia: Category.GYM,
  gym: Category.GYM,
  supermercado: Category.SUPER,
  super: Category.SUPER,
  nafta: Category.AUTO,
  combustible: Category.AUTO,
  patente: Category.AUTO,
  farmacia: Category.SALUD,
  medico: Category.SALUD,
  doctor: Category.SALUD,
  luz: Category.SERVICIOS,
  gas: Category.SERVICIOS,
  agua: Category.SERVICIOS,
  internet: Category.SERVICIOS,
  restaurante: Category.SALIDAS,
  bar: Category.SALIDAS,
  peluqueria: Category.PELO,
  impuesto: Category.TAXES,
  impuestos: Category.TAXES,
  devolucion: Category.REFUNDS,
  devoluciones: Category.REFUNDS,
}

export function buildCategoryAliasMap(
  enabledFixedCategories: Category[],
): Map<string, Category> {
  const map = new Map<string, Category>()
  const enabled = new Set(enabledFixedCategories)

  for (const category of enabledFixedCategories) {
    map.set(normalizeSearchText(CATEGORY_LABELS[category]), category)
  }

  for (const [alias, category] of Object.entries(EXTRA_ALIASES)) {
    if (!enabled.has(category)) continue
    map.set(normalizeSearchText(alias), category)
  }

  map.set('otros', Category.OTHER)
  map.set('otro', Category.OTHER)

  return map
}

export function lookupFixedCategory(phrase: string): Category | null {
  const normalized = normalizeSearchText(phrase)
  for (const category of Object.values(Category)) {
    if (category === Category.OTHER) continue
    if (normalizeSearchText(CATEGORY_LABELS[category]) === normalized) {
      return category
    }
  }
  return EXTRA_ALIASES[normalized] ?? null
}

export function allKnownFixedLabels(): string[] {
  return Object.values(CATEGORY_LABELS).map((label) => normalizeSearchText(label))
}
