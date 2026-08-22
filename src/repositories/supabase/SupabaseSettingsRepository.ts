import { getSupabaseClient } from '@/lib/supabaseClient'
import { isMissingColumnError } from '@/lib/supabaseSchemaCompat'
import {
  createDefaultSettings,
  mergeSettingsUpdate,
  normalizeSettings,
} from '@/services/SettingsDefaults'
import { MonthMode } from '@/types/enums'
import type { Settings, UpdateSettingsInput } from '@/types/models'
import type { SettingsRepository } from '../interfaces'

interface SettingsRow {
  user_id: string
  usd_white: number
  usd_cash: number
  monthly_limit: number
  custom_categories?: string[] | null
  enabled_accounts?: string[] | null
  enabled_currencies?: string[] | null
  enabled_fixed_categories?: string[] | null
  income_sources?: string[] | null
  month_mode?: string | null
  accounting_currency?: string | null
  summary_display_mode?: string | null
  onboarding_completed?: boolean | null
  trips_module_enabled?: boolean | null
  savings_locations?: string[] | Record<string, unknown> | null
  savings_balances?: Record<string, number> | null
  updated_at: string
}

function mapRow(row: SettingsRow): Settings {
  return normalizeSettings(
    {
      userId: row.user_id,
      usdWhite: Number(row.usd_white),
      usdCash: Number(row.usd_cash),
      monthlyLimit: Number(row.monthly_limit),
      customCategories: Array.isArray(row.custom_categories) ? row.custom_categories : [],
      incomeSources: Array.isArray(row.income_sources) ? row.income_sources : [],
      enabledAccounts: row.enabled_accounts as Settings['enabledAccounts'],
      enabledCurrencies: row.enabled_currencies as Settings['enabledCurrencies'],
      enabledFixedCategories: row.enabled_fixed_categories as Settings['enabledFixedCategories'],
      monthMode: (row.month_mode as MonthMode | null) ?? MonthMode.AUTOMATIC,
      accountingCurrency: row.accounting_currency as Settings['accountingCurrency'],
      summaryDisplayMode: row.summary_display_mode as Settings['summaryDisplayMode'],
      onboardingCompleted: Boolean(row.onboarding_completed),
      tripsModuleEnabled: Boolean(row.trips_module_enabled),
      savingsLocations: Array.isArray(row.savings_locations) ? row.savings_locations : [],
      savingsBalances:
        row.savings_balances && typeof row.savings_balances === 'object'
          ? (row.savings_balances as Record<string, number>)
          : {},
      updatedAt: row.updated_at,
    },
    row.user_id,
  )
}

function toRow(
  settings: Settings,
  options?: { includeIncomeSources?: boolean; includeTripsModule?: boolean; includeSavings?: boolean },
) {
  const row: Record<string, unknown> = {
    user_id: settings.userId,
    usd_white: settings.usdWhite,
    usd_cash: settings.usdCash,
    monthly_limit: settings.monthlyLimit,
    custom_categories: settings.customCategories,
    enabled_accounts: settings.enabledAccounts,
    enabled_currencies: settings.enabledCurrencies,
    enabled_fixed_categories: settings.enabledFixedCategories,
    month_mode: settings.monthMode,
    accounting_currency: settings.accountingCurrency,
    summary_display_mode: settings.summaryDisplayMode,
    onboarding_completed: settings.onboardingCompleted,
    updated_at: settings.updatedAt,
  }

  if (options?.includeTripsModule !== false) {
    row.trips_module_enabled = settings.tripsModuleEnabled
  }

  if (options?.includeIncomeSources !== false) {
    row.income_sources = settings.incomeSources
  }

  if (options?.includeSavings !== false) {
    row.savings_locations = settings.savingsLocations
    row.savings_balances = settings.savingsBalances
  }

  return row
}

async function writeSettingsRow(
  userId: string,
  settings: Settings,
  mode: 'insert' | 'update',
): Promise<SettingsRow> {
  const supabase = getSupabaseClient()

  const optionSets: Array<{
    includeIncomeSources?: boolean
    includeTripsModule?: boolean
    includeSavings?: boolean
  }> = [
    {},
    { includeIncomeSources: false },
    { includeTripsModule: false },
    { includeSavings: false },
    { includeIncomeSources: false, includeTripsModule: false },
    { includeIncomeSources: false, includeSavings: false },
    { includeTripsModule: false, includeSavings: false },
    { includeIncomeSources: false, includeTripsModule: false, includeSavings: false },
  ]

  let lastError: unknown = null

  for (const options of optionSets) {
    const row = toRow(settings, options)

    if (mode === 'update') {
      const result = await supabase
        .from('settings')
        .update(row)
        .eq('user_id', userId)
        .select('*')
        .single()

      if (!result.error) return result.data as SettingsRow

      if (
        isMissingColumnError(result.error, 'income_sources') ||
        isMissingColumnError(result.error, 'trips_module_enabled') ||
        isMissingColumnError(result.error, 'savings_locations') ||
        isMissingColumnError(result.error, 'savings_balances')
      ) {
        lastError = result.error
        continue
      }

      throw result.error
    }

    const result = await supabase.from('settings').insert(row).select('*').single()

    if (!result.error) return result.data as SettingsRow

    if (
      isMissingColumnError(result.error, 'income_sources') ||
      isMissingColumnError(result.error, 'trips_module_enabled') ||
      isMissingColumnError(result.error, 'savings_locations') ||
      isMissingColumnError(result.error, 'savings_balances')
    ) {
      lastError = result.error
      continue
    }

    throw result.error
  }

  throw lastError ?? new Error('No se pudo guardar la configuración')
}

export class SupabaseSettingsRepository implements SettingsRepository {
  async get(userId: string): Promise<Settings> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error

    if (data) return mapRow(data as SettingsRow)

    const defaults = createDefaultSettings(userId)
    const created = await writeSettingsRow(userId, defaults, 'insert')
    return mapRow(created)
  }

  async update(userId: string, input: UpdateSettingsInput): Promise<Settings> {
    const current = await this.get(userId)
    const next = mergeSettingsUpdate(current, input)
    const updated = await writeSettingsRow(userId, next, 'update')
    return mapRow(updated)
  }
}
