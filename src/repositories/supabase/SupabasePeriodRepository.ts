import { getSupabaseClient } from '@/lib/supabaseClient'
import { isMissingColumnError } from '@/lib/supabaseSchemaCompat'
import { PeriodService } from '@/services/PeriodService'
import { PeriodStatus } from '@/types/enums'
import type { Period } from '@/types/models'
import { getYearMonthKey, nextYearMonth } from '@/utils/date'
import type { PeriodRepository } from '../interfaces'
import type { SupabaseClient } from '@supabase/supabase-js'

interface PeriodRow {
  id: string
  user_id: string
  label: string
  year_month: string
  status: PeriodStatus
  started_at: string
  closed_at: string | null
  monthly_limit_snapshot: number | null
  savings_applied_at?: string | null
  savings_applied_amount?: number | null
  savings_applied_location?: string | null
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
    savingsAppliedAt: row.savings_applied_at ?? null,
    savingsAppliedAmount:
      row.savings_applied_amount === null || row.savings_applied_amount === undefined
        ? null
        : Number(row.savings_applied_amount),
    savingsAppliedLocation: row.savings_applied_location ?? null,
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
    savings_applied_at: period.savingsAppliedAt,
    savings_applied_amount: period.savingsAppliedAmount,
    savings_applied_location: period.savingsAppliedLocation,
  }
}

function cleanPeriodRow(row: PeriodRow): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined))
}

function periodRowVariants(period: Period): PeriodRow[] {
  const fullRow = toRow(period)
  return [
    fullRow,
    { ...fullRow, savings_applied_location: undefined, savings_applied_amount: undefined },
    {
      ...fullRow,
      savings_applied_location: undefined,
      savings_applied_amount: undefined,
      savings_applied_at: undefined,
    },
  ]
}

function isMissingSavingsPeriodColumnError(error: unknown): boolean {
  return (
    isMissingColumnError(error, 'savings_applied_at') ||
    isMissingColumnError(error, 'savings_applied_amount') ||
    isMissingColumnError(error, 'savings_applied_location')
  )
}

async function updatePeriodWithFallback(
  supabase: SupabaseClient,
  userId: string,
  periodId: string,
  period: Period,
  options: { returnRow?: boolean } = {},
): Promise<Period | void> {
  const { returnRow = false } = options
  let lastError: unknown = null

  for (const row of periodRowVariants({ ...period, userId })) {
    const query = supabase
      .from('periods')
      .update(cleanPeriodRow(row))
      .eq('id', periodId)
      .eq('user_id', userId)

    const result = returnRow ? await query.select('*').single() : await query

    if (!result.error) {
      return returnRow ? mapRow(result.data as PeriodRow) : undefined
    }

    if (isMissingSavingsPeriodColumnError(result.error)) {
      lastError = result.error
      continue
    }

    throw result.error
  }

  throw lastError ?? new Error('No se pudo actualizar el período')
}

async function insertPeriodWithFallback(
  supabase: SupabaseClient,
  period: Period,
): Promise<Period> {
  let lastError: unknown = null

  for (const row of periodRowVariants(period)) {
    const result = await supabase
      .from('periods')
      .insert(cleanPeriodRow(row))
      .select('*')
      .single()

    if (!result.error) return mapRow(result.data as PeriodRow)

    if (isMissingSavingsPeriodColumnError(result.error)) {
      lastError = result.error
      continue
    }

    throw result.error
  }

  throw lastError ?? new Error('No se pudo crear el período')
}

async function insertManyPeriodsWithFallback(
  supabase: SupabaseClient,
  periods: Period[],
): Promise<void> {
  const rows = periods.map((period) => toRow(period))
  const fallbackRowsList: PeriodRow[][] = [
    rows,
    rows.map((row) => ({
      ...row,
      savings_applied_location: undefined,
      savings_applied_amount: undefined,
    })),
    rows.map((row) => ({
      ...row,
      savings_applied_location: undefined,
      savings_applied_amount: undefined,
      savings_applied_at: undefined,
    })),
  ]

  let lastError: unknown = null

  for (const variant of fallbackRowsList) {
    const result = await supabase
      .from('periods')
      .insert(variant.map((row) => cleanPeriodRow(row)))

    if (!result.error) return

    if (isMissingSavingsPeriodColumnError(result.error)) {
      lastError = result.error
      continue
    }

    throw result.error
  }

  throw lastError ?? new Error('No se pudieron importar los períodos')
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
    return insertPeriodWithFallback(getSupabaseClient(), created)
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

    await updatePeriodWithFallback(supabase, userId, closed.id, closed)

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
      return (await updatePeriodWithFallback(
        supabase,
        userId,
        reactivated.id,
        reactivated,
        { returnRow: true },
      )) as Period
    }

    const next = PeriodService.buildPeriod(userId, targetYearMonth, {
      monthlyLimitSnapshot: monthlyLimit,
    })
    return insertPeriodWithFallback(supabase, next)
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

    return insertPeriodWithFallback(getSupabaseClient(), planned)
  }

  async replaceAll(userId: string, periods: Period[]): Promise<void> {
    const supabase = getSupabaseClient()
    const { error: deleteError } = await supabase
      .from('periods')
      .delete()
      .eq('user_id', userId)
    if (deleteError) throw deleteError

    if (periods.length === 0) return

    await insertManyPeriodsWithFallback(
      supabase,
      periods.map((period) => ({ ...period, userId })),
    )
  }

  async update(userId: string, period: Period): Promise<Period> {
    return (await updatePeriodWithFallback(
      getSupabaseClient(),
      userId,
      period.id,
      { ...period, userId },
      { returnRow: true },
    )) as Period
  }
}
