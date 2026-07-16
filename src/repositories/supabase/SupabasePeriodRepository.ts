import { getSupabaseClient } from '@/lib/supabaseClient'
import { PeriodService } from '@/services/PeriodService'
import { PeriodStatus } from '@/types/enums'
import type { Period } from '@/types/models'
import { getYearMonthKey } from '@/utils/date'
import type { PeriodRepository } from '../interfaces'

interface PeriodRow {
  id: string
  user_id: string
  label: string
  year_month: string
  status: PeriodStatus
  started_at: string
  closed_at: string | null
  monthly_limit_snapshot: number | null
}

function mapRow(row: PeriodRow): Period {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    yearMonth: row.year_month,
    status: row.status,
    startedAt: row.started_at,
    closedAt: row.closed_at,
    monthlyLimitSnapshot:
      row.monthly_limit_snapshot === null ? null : Number(row.monthly_limit_snapshot),
  }
}

function toRow(period: Period): PeriodRow {
  return {
    id: period.id,
    user_id: period.userId,
    label: period.label,
    year_month: period.yearMonth,
    status: period.status,
    started_at: period.startedAt,
    closed_at: period.closedAt,
    monthly_limit_snapshot: period.monthlyLimitSnapshot,
  }
}

export class SupabasePeriodRepository implements PeriodRepository {
  async list(userId: string): Promise<Period[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('periods')
      .select('*')
      .eq('user_id', userId)
      .order('year_month', { ascending: true })

    if (error) throw error
    return PeriodService.sortPeriods((data as PeriodRow[]).map(mapRow))
  }

  async getActive(userId: string): Promise<Period | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('periods')
      .select('*')
      .eq('user_id', userId)
      .eq('status', PeriodStatus.ACTIVE)
      .maybeSingle()

    if (error) throw error
    return data ? mapRow(data as PeriodRow) : null
  }

  async ensureActive(userId: string, monthlyLimit: number): Promise<Period> {
    const active = await this.getActive(userId)
    if (active) return active

    const created = PeriodService.currentCalendarPeriod(userId)
    created.monthlyLimitSnapshot = monthlyLimit
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('periods')
      .insert(toRow(created))
      .select('*')
      .single()
    if (error) throw error
    return mapRow(data as PeriodRow)
  }

  async closeAndOpenNext(userId: string, monthlyLimit: number): Promise<Period> {
    const active = await this.ensureActive(userId, monthlyLimit)
    const closed = PeriodService.closePeriod(active)
    const next = PeriodService.openNextPeriod(userId, closed, monthlyLimit)
    const supabase = getSupabaseClient()

    const { error: closeError } = await supabase
      .from('periods')
      .update(toRow(closed))
      .eq('id', closed.id)
      .eq('user_id', userId)
    if (closeError) throw closeError

    const { data, error } = await supabase
      .from('periods')
      .insert(toRow(next))
      .select('*')
      .single()
    if (error) throw error
    return mapRow(data as PeriodRow)
  }

  async rolloverIfNeeded(userId: string, monthlyLimit: number): Promise<Period> {
    const active = await this.ensureActive(userId, monthlyLimit)
    const currentKey = getYearMonthKey()
    if (active.yearMonth === currentKey) return active

    const closed = PeriodService.closePeriod(active)
    const next = PeriodService.buildPeriod(userId, currentKey, {
      monthlyLimitSnapshot: monthlyLimit,
    })
    const supabase = getSupabaseClient()

    const { error: closeError } = await supabase
      .from('periods')
      .update(toRow(closed))
      .eq('id', closed.id)
      .eq('user_id', userId)
    if (closeError) throw closeError

    const { data, error } = await supabase
      .from('periods')
      .insert(toRow(next))
      .select('*')
      .single()
    if (error) throw error
    return mapRow(data as PeriodRow)
  }

  async replaceAll(userId: string, periods: Period[]): Promise<void> {
    const supabase = getSupabaseClient()
    const { error: deleteError } = await supabase
      .from('periods')
      .delete()
      .eq('user_id', userId)
    if (deleteError) throw deleteError

    if (periods.length === 0) return

    const { error } = await supabase
      .from('periods')
      .insert(periods.map((p) => toRow({ ...p, userId })))
    if (error) throw error
  }
}
