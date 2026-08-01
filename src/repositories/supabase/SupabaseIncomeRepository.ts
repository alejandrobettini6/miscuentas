import { getSupabaseClient } from '@/lib/supabaseClient'
import { isMissingColumnError } from '@/lib/supabaseSchemaCompat'
import { IncomeService } from '@/services/IncomeService'
import type { AccountType, Currency } from '@/types/enums'
import type {
  CreateIncomeInput,
  Income,
  Settings,
  UpdateIncomeInput,
} from '@/types/models'
import type { IncomeRepository } from '../interfaces'

const INCOMES_MIGRATION_HINT =
  'Falta migración en Supabase: ejecutá supabase/migration_incomes_fix.sql en el SQL Editor.'

interface IncomeRow {
  id: string
  user_id: string
  period_id: string
  account_type: AccountType
  description?: string | null
  original_currency: Currency
  original_amount: number
  exchange_rate: number
  usd_amount: number
  created_at: string
  updated_at: string
}

function mapRow(row: IncomeRow): Income {
  return {
    id: row.id,
    userId: row.user_id,
    periodId: row.period_id,
    accountType: row.account_type,
    description: row.description ?? '',
    originalCurrency: row.original_currency,
    originalAmount: Number(row.original_amount),
    exchangeRate: Number(row.exchange_rate),
    usdAmount: Number(row.usd_amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRow(income: Income, options?: { includeDescription?: boolean }) {
  const row = {
    id: income.id,
    user_id: income.userId,
    period_id: income.periodId,
    account_type: income.accountType,
    original_currency: income.originalCurrency,
    original_amount: income.originalAmount,
    exchange_rate: income.exchangeRate,
    usd_amount: income.usdAmount,
    created_at: income.createdAt,
    updated_at: income.updatedAt,
  }

  if (options?.includeDescription !== false) {
    return { ...row, description: income.description }
  }
  return row
}

function hasDescriptionContent(description: string | undefined): boolean {
  return Boolean(description?.trim())
}

function assertDescriptionMigrationIfNeeded(description: string | undefined): void {
  if (hasDescriptionContent(description)) {
    throw new Error(INCOMES_MIGRATION_HINT)
  }
}

async function insertIncomeRow(
  row: ReturnType<typeof toRow>,
  description?: string,
): Promise<IncomeRow> {
  const supabase = getSupabaseClient()
  let result = await supabase.from('incomes').insert(row).select('*').single()

  if (result.error && isMissingColumnError(result.error, 'description')) {
    assertDescriptionMigrationIfNeeded(description)
    const { description: _, ...legacyRow } = row as ReturnType<typeof toRow> & {
      description?: string
    }
    result = await supabase.from('incomes').insert(legacyRow).select('*').single()
  }

  if (result.error) throw result.error
  return result.data as IncomeRow
}

async function updateIncomeRow(
  userId: string,
  incomeId: string,
  row: ReturnType<typeof toRow>,
  description?: string,
): Promise<IncomeRow> {
  const supabase = getSupabaseClient()
  let result = await supabase
    .from('incomes')
    .update(row)
    .eq('id', incomeId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (result.error && isMissingColumnError(result.error, 'description')) {
    assertDescriptionMigrationIfNeeded(description)
    const { description: _, ...legacyRow } = row as ReturnType<typeof toRow> & {
      description?: string
    }
    result = await supabase
      .from('incomes')
      .update(legacyRow)
      .eq('id', incomeId)
      .eq('user_id', userId)
      .select('*')
      .single()
  }

  if (result.error) throw result.error
  return result.data as IncomeRow
}

export class SupabaseIncomeRepository implements IncomeRepository {
  async list(userId: string): Promise<Income[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('incomes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data as IncomeRow[]).map(mapRow)
  }

  async create(
    userId: string,
    input: CreateIncomeInput,
    settings: Settings,
  ): Promise<Income> {
    const income = IncomeService.buildIncome(userId, input, settings)
    const data = await insertIncomeRow(toRow(income), income.description)
    return mapRow(data)
  }

  async update(
    userId: string,
    incomeId: string,
    input: UpdateIncomeInput,
    settings: Settings,
  ): Promise<Income> {
    const all = await this.list(userId)
    const current = all.find((income) => income.id === incomeId)
    if (!current) throw new Error('Ingreso no encontrado')

    const updated = IncomeService.updateIncome(current, input, settings)
    const data = await updateIncomeRow(userId, incomeId, toRow(updated), updated.description)
    return mapRow(data)
  }

  async remove(userId: string, incomeId: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('incomes')
      .delete()
      .eq('id', incomeId)
      .eq('user_id', userId)

    if (error) throw error
  }

  async replaceAll(userId: string, incomes: Income[]): Promise<void> {
    const supabase = getSupabaseClient()
    const { error: deleteError } = await supabase
      .from('incomes')
      .delete()
      .eq('user_id', userId)
    if (deleteError) throw deleteError

    if (incomes.length === 0) return

    const rows = incomes.map((income) => toRow({ ...income, userId }))
    let result = await supabase.from('incomes').insert(rows)

    if (result.error && isMissingColumnError(result.error, 'description')) {
      const hasAnyDescription = incomes.some((income) =>
        hasDescriptionContent(income.description),
      )
      if (hasAnyDescription) {
        throw new Error(INCOMES_MIGRATION_HINT)
      }

      const legacyRows = rows.map((row) => {
        const { description: _description, ...legacyRow } = row as ReturnType<
          typeof toRow
        > & { description?: string }
        return legacyRow
      })
      result = await supabase.from('incomes').insert(legacyRows)
    }

    if (result.error) throw result.error
  }
}
