import { PeriodStatus } from '@/types/enums'
import type { Period } from '@/types/models'
import {
  getMonthLabelFromKey,
  getYearMonthKey,
  nextYearMonth,
} from '@/utils/date'
import { createId } from '@/utils/id'

export class PeriodService {
  static buildPeriod(
    userId: string,
    yearMonth: string,
    options?: {
      status?: PeriodStatus
      monthlyLimitSnapshot?: number | null
      now?: Date
      id?: string
    },
  ): Period {
    const now = options?.now ?? new Date()
    const status = options?.status ?? PeriodStatus.ACTIVE
    return {
      id: options?.id ?? createId(),
      userId,
      label: getMonthLabelFromKey(yearMonth),
      yearMonth,
      status,
      startedAt: now.toISOString(),
      closedAt: status === PeriodStatus.CLOSED ? now.toISOString() : null,
      monthlyLimitSnapshot: options?.monthlyLimitSnapshot ?? null,
    }
  }

  static currentCalendarPeriod(userId: string, now = new Date()): Period {
    return this.buildPeriod(userId, getYearMonthKey(now), { now })
  }

  static closePeriod(period: Period, now = new Date()): Period {
    return {
      ...period,
      status: PeriodStatus.CLOSED,
      closedAt: now.toISOString(),
    }
  }

  static openNextPeriod(
    userId: string,
    closed: Period,
    monthlyLimitSnapshot: number | null,
    now = new Date(),
  ): Period {
    return this.buildPeriod(userId, nextYearMonth(closed.yearMonth), {
      now,
      monthlyLimitSnapshot,
    })
  }

  static sortPeriods(periods: Period[]): Period[] {
    return [...periods].sort((a, b) => {
      if (a.yearMonth !== b.yearMonth) {
        return a.yearMonth.localeCompare(b.yearMonth)
      }
      return a.startedAt.localeCompare(b.startedAt)
    })
  }

  static getActive(periods: Period[]): Period | null {
    return this.sortPeriods(periods).find((p) => p.status === PeriodStatus.ACTIVE) ?? null
  }
}
