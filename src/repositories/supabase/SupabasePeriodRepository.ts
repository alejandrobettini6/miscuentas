import { getSupabaseClient } from '@/lib/supabaseClient'
import { PeriodService } from '@/services/PeriodService'
import { PeriodStatus } from '@/types/enums'
import type { Period } from '@/types/models'
import { getYearMonthKey, nextYearMonth } from '@/utils/date'
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

  /**
   * Puede haber más de un período ACTIVE simultáneo (el actual + meses
   * adelantados sin cerrar), así que no usamos `maybeSingle` (rompería con
   * más de una fila). Devolvemos el ACTIVE más antiguo: el período "real".
   */
  async getActive(userId: string): Promise<Period | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('periods')
      .select('*')
      .eq('user_id', userId)
      .eq('status', PeriodStatus.ACTIVE)
      .order('year_month', { ascending: true })
      .limit(1)

    if (error) throw error
    const rows = data as PeriodRow[]
    return rows.length > 0 ? mapRow(rows[0]) : null
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

  /**
   * Cierra `active` y activa el período de `targetYearMonth`. Si ese mes ya
   * existía (ej. fue creado por adelantado con `createNextPeriod`), lo
   * reutiliza en vez de duplicarlo.
   */
  private async closeActiveAndActivateYearMonth(
    userId: string,
    active: Period,
    targetYearMonth: string,
    monthlyLimit: number,
  ): Promise<Period> {
    const supabase = getSupabaseClient()
    const closed = PeriodService.closePeriod(active)

    const { error: closeError } = await supabase
      .from('periods')
      .update(toRow(closed))
      .eq('id', closed.id)
      .eq('user_id', userId)
    if (closeError) throw closeError

    const { data: existingRows, error: existingError } = await supabase
      .from('periods')
      .select('*')
      .eq('user_id', userId)
      .eq('year_month', targetYearMonth)
      .neq('id', closed.id)
      .limit(1)
    if (existingError) throw existingError

    const existingRow = (existingRows as PeriodRow[])[0]
    if (existingRow) {
      const reactivated: Period = {
        ...mapRow(existingRow),
        status: PeriodStatus.ACTIVE,
        closedAt: null,
        monthlyLimitSnapshot: monthlyLimit,
      }
      const { data, error } = await supabase
        .from('periods')
        .update(toRow(reactivated))
        .eq('id', reactivated.id)
        .eq('user_id', userId)
        .select('*')
        .single()
      if (error) throw error
      return mapRow(data as PeriodRow)
    }

    const next = PeriodService.buildPeriod(userId, targetYearMonth, {
      monthlyLimitSnapshot: monthlyLimit,
    })
    const { data, error } = await supabase
      .from('periods')
      .insert(toRow(next))
      .select('*')
      .single()
    if (error) throw error
    return mapRow(data as PeriodRow)
  }

  async closeAndOpenNext(userId: string, monthlyLimit: number): Promise<Period> {
    const active = await this.ensureActive(userId, monthlyLimit)
    return this.closeActiveAndActivateYearMonth(
      userId,
      active,
      nextYearMonth(active.yearMonth),
      monthlyLimit,
    )
  }

  async rolloverIfNeeded(userId: string, monthlyLimit: number): Promise<Period> {
    const active = await this.ensureActive(userId, monthlyLimit)
    const currentKey = getYearMonthKey()
    if (active.yearMonth === currentKey) return active

    return this.closeActiveAndActivateYearMonth(
      userId,
      active,
      currentKey,
      monthlyLimit,
    )
  }

  /**
   * Crea (o reutiliza) el período siguiente al último existente sin cerrar
   * ni modificar el período activo actual. Permite registrar gastos por
   * adelantado en un mes futuro.
   */
  async createNextPeriod(userId: string, monthlyLimit: number): Promise<Period> {
    const periods = await this.list(userId)
    const planned = PeriodService.planNextPeriod(periods, userId, monthlyLimit)
    if (periods.some((p) => p.id === planned.id)) {
      return planned
    }

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('periods')
      .insert(toRow(planned))
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
