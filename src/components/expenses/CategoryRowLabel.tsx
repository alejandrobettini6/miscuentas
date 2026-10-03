import { getCategoryEmoji } from '@/constants/categories'
import type { CategoryRow, CombinedCategoryRow } from '@/types/models'

type RowLike = Pick<
  CategoryRow,
  'category' | 'isOtrosGrande' | 'label' | 'description'
> &
  Partial<
    Pick<CombinedCategoryRow, 'category' | 'isOtrosGrande' | 'label' | 'description'>
  >

interface CategoryRowLabelProps {
  row: RowLike
  /** Clases del texto del nombre (tamaño/peso). */
  labelClassName?: string
}

export function CategoryRowLabel({
  row,
  labelClassName = 'text-lg font-medium',
}: CategoryRowLabelProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-xl leading-none" aria-hidden="true">
        {getCategoryEmoji(row)}
      </span>
      <span className={`truncate ${labelClassName}`}>{row.label}</span>
    </div>
  )
}
