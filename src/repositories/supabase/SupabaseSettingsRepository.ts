import { getSupabaseClient } from '@/lib/supabaseClient'
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
  month_mode?: string | null
  onboarding_completed?: boolean | null
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
      enabledAccounts: row.enabled_accounts as Settings['enabledAccounts'],
      enabledCurrencies: row.enabled_currencies as Settings['enabledCurrencies'],
      enabledFixedCategories: row.enabled_fixed_categories as Settings['enabledFixedCategories'],
      monthMode: (row.month_mode as MonthMode | null) ?? MonthMode.AUTOMATIC,
      onboardingCompleted: Boolean(row.onboarding_completed),
      updatedAt: row.updated_at,
    },
    row.user_id,
  )
}

function toRow(settings: Settings) {
  return {
    user_id: settings.userId,
    usd_white: settings.usdWhite,
    usd_cash: settings.usdCash,
    monthly_limit: settings.monthlyLimit,
    custom_categories: settings.customCategories,
    enabled_accounts: settings.enabledAccounts,
    enabled_currencies: settings.enabledCurrencies,
    enabled_fixed_categories: settings.enabledFixedCategories,
    month_mode: settings.monthMode,
    onboarding_completed: settings.onboardingCompleted,
    updated_at: settings.updatedAt,
  }
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
    const { data: created, error: insertError } = await supabase
      .from('settings')
      .insert(toRow(defaults))
      .select('*')
      .single()

    if (insertError) throw insertError
    return mapRow(created as SettingsRow)
  }

  async update(userId: string, input: UpdateSettingsInput): Promise<Settings> {
    const current = await this.get(userId)
    const next = mergeSettingsUpdate(current, input)

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('settings')
      .upsert(toRow(next))
      .select('*')
      .single()

    if (error) throw error
    return mapRow(data as SettingsRow)
  }
}
