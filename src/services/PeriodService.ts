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

  /**
   * El período activo "real": el ACTIVE con el yearMonth más antiguo.
   * Puede haber más de un ACTIVE simultáneo (el actual + adelantados),
   * ver `findOrBuildForYearMonth`/`planNextPeriod`.
   */
  static getActive(periods: Period[]): Period | null {
    return this.sortPeriods(periods).find((p) => p.status === PeriodStatus.ACTIVE) ?? null
  }

  /**
   * Busca un período existente para `yearMonth` (sin importar su status) y
   * lo devuelve; si no existe, construye uno nuevo. Evita duplicar un mes
   * que ya haya sido creado por adelantado.
   */
  static findOrBuildForYearMonth(
    periods: Period[],
    userId: string,
    yearMonth: string,
    options?: {
      status?: PeriodStatus
      monthlyLimitSnapshot?: number | null
      now?: Date
    },
  ): Period {
    const existing = periods.find((p) => p.yearMonth === yearMonth)
    if (existing) return existing
    return this.buildPeriod(userId, yearMonth, options)
  }

  /**
   * Período a crear/reutilizar para "adelantar" un mes sin cerrar el
   * activo actual: el siguiente al último período existente (por
   * yearMonth). Si ya existe un período para ese mes, se reutiliza tal
   * cual en vez de duplicarlo.
   */
  static planNextPeriod(
    periods: Period[],
    userId: string,
    monthlyLimit: number,
    now = new Date(),
  ): Period {
    const sorted = this.sortPeriods(periods)
    const last = sorted[sorted.length - 1]
    const targetYearMonth = last
      ? nextYearMonth(last.yearMonth)
      : getYearMonthKey(now)

    return this.findOrBuildForYearMonth(periods, userId, targetYearMonth, {
      status: PeriodStatus.ACTIVE,
      monthlyLimitSnapshot: monthlyLimit,
      now,
    })
  }
}
