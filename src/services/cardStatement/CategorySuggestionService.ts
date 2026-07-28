import { Category } from '@/types/enums'

export type CategorySuggestion =
  | { kind: 'fixed'; category: Category }
  | { kind: 'custom'; name: string }

/**
 * Stub for future merchant → category suggestions.
 * TODO: implementar reglas / ML en modo automático del import de resumen.
 */
export const CategorySuggestionService = {
  suggest(_merchantLabel: string): CategorySuggestion | null {
    return null
  },
}
