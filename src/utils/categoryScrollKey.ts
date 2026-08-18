import type { CategoryRow } from '@/types/models'

export function categoryRowScrollKey(
  row: Pick<CategoryRow, 'label' | 'isOtrosGrande' | 'category' | 'description'>,
): string {
  if (row.isOtrosGrande) {
    return `otros-grande:${(row.description ?? row.label ?? '').trim().toLowerCase()}`
  }
  return `category:${row.category}`
}
