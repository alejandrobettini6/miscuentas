import { STORAGE_KEYS } from '@/constants/storage'
import { readJson, writeJson } from '@/lib/localStorage'
import { PeriodService } from '@/services/PeriodService'
import { PeriodStatus } from '@/types/enums'
import type { Expense, Period } from '@/types/models'
import { getYearMonthKey } from '@/utils/date'
import type { PeriodRepository } from '../interfaces'

function periodsKey(userId: string): string {
  return `${STORAGE_KEYS.PERIODS}:${userId}`
}

function expensesKey(userId: string): string {
  return `${STORAGE_KEYS.EXPENSES}:${userId}`
}

export class LocalPeriodRepository implements PeriodRepository {
  async list(userId: string): Promise<Period[]> {
    return PeriodService.sortPeriods(readJson<Period[]>(periodsKey(userId), []))
  }

  private async save(userId: string, periods: Period[]): Promise<void> {
    writeJson(periodsKey(userId), PeriodService.sortPeriods(periods))
  }

  async getActive(userId: string): Promise<Period | null> {
    return PeriodService.getActive(await this.list(userId))
  }

  /** Asigna periodId a gastos legacy y crea período activo si falta. */
  private async migrateLegacyExpenses(userId: string, active: Period): Promise<void> {
    const expenses = readJson<Expense[]>(expensesKey(userId), [])
    let changed = false
    const periodIds = new Set((await this.list(userId)).map((p) => p.id))
    periodIds.add(active.id)

    const next = expenses.map((expense) => {
      if (expense.periodId && periodIds.has(expense.periodId)) return expense
      changed = true
      return { ...expense, userId, periodId: active.id }
    })

    if (changed) {
      writeJson(expensesKey(userId), next)
    }
  }

  async ensureActive(userId: string, monthlyLimit: number): Promise<Period> {
    let active = await this.getActive(userId)
    if (!active) {
      active = PeriodService.currentCalendarPeriod(userId)
      active.monthlyLimitSnapshot = monthlyLimit
      await this.save(userId, [active])
    }
    await this.migrateLegacyExpenses(userId, active)
    return active
  }

  async closeAndOpenNext(userId: string, monthlyLimit: number): Promise<Period> {
    const periods = await this.list(userId)
    const active = PeriodService.getActive(periods)
    if (!active) {
      return this.ensureActive(userId, monthlyLimit)
    }

    const closed = PeriodService.closePeriod(active)
    const next = PeriodService.openNextPeriod(userId, closed, monthlyLimit)
    const updated = periods.map((p) => (p.id === closed.id ? closed : p))
    updated.push(next)
    await this.save(userId, updated)
    return next
  }

  async rolloverIfNeeded(userId: string, monthlyLimit: number): Promise<Period> {
    const active = await this.ensureActive(userId, monthlyLimit)
    const currentKey = getYearMonthKey()
    if (active.yearMonth === currentKey) return active

    const periods = await this.list(userId)
    const closed = PeriodService.closePeriod(active)
    const existingCurrent = periods.find((p) => p.yearMonth === currentKey)

    let next: Period
    if (existingCurrent) {
      next = {
        ...existingCurrent,
        status: PeriodStatus.ACTIVE,
        closedAt: null,
        monthlyLimitSnapshot: monthlyLimit,
      }
    } else {
      next = PeriodService.buildPeriod(userId, currentKey, {
        monthlyLimitSnapshot: monthlyLimit,
      })
    }

    const updated = periods
      .filter((p) => p.id !== next.id)
      .map((p) => (p.id === closed.id ? closed : p))
    updated.push(next)
    await this.save(userId, updated)
    return next
  }

  async replaceAll(userId: string, periods: Period[]): Promise<void> {
    await this.save(
      userId,
      periods.map((p) => ({ ...p, userId })),
    )
  }
}
