import { getTripCategoryEmoji } from '@/constants/tripCategories'
import type { TripCategoryRow } from '@/types/models'

interface TripCategoryRowLabelProps {
  row: Pick<TripCategoryRow, 'category' | 'isOtrosGrande' | 'label'>
  labelClassName?: string
}

export function TripCategoryRowLabel({
  row,
  labelClassName = 'text-lg font-medium',
}: TripCategoryRowLabelProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-xl leading-none" aria-hidden="true">
        {getTripCategoryEmoji(row)}
      </span>
      <span className={`truncate ${labelClassName}`}>{row.label}</span>
    </div>
  )
}
