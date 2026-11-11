import { PeriodStatus } from '@/types/enums'
import type { Period } from '@/types/models'

export function periodForMercadoPagoNotice(
  periods: Period[],
  postedAt: string,
  selected: Period | null,
): Period | null {
  const yearMonth = postedAt.slice(0, 7)
  const inMonth = periods.filter((period) => period.yearMonth === yearMonth)
  const activeInMonth = inMonth.find((period) => period.status === PeriodStatus.ACTIVE)
  if (activeInMonth) return activeInMonth
  if (inMonth[0]) return inMonth[0]
  if (selected?.status === PeriodStatus.ACTIVE) return selected
  return periods.find((period) => period.status === PeriodStatus.ACTIVE) ?? selected
}
