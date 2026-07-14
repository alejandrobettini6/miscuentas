import { DEFAULT_SETTINGS } from '@/constants/categories'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { Settings, UpdateSettingsInput } from '@/types/models'
import type { SettingsRepository } from '../interfaces'

interface SettingsRow {
  user_id: string
  usd_white: number
  usd_cash: number
  monthly_limit: number
  custom_categories?: string[] | null
  updated_at: string
}

function mapRow(row: SettingsRow): Settings {
  return {
    userId: row.user_id,
    usdWhite: Number(row.usd_white),
    usdCash: Number(row.usd_cash),
    monthlyLimit: Number(row.monthly_limit),
    customCategories: Array.isArray(row.custom_categories) ? row.custom_categories : [],
    updatedAt: row.updated_at,
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

    const defaults = {
      user_id: userId,
      usd_white: DEFAULT_SETTINGS.usdWhite,
      usd_cash: DEFAULT_SETTINGS.usdCash,
      monthly_limit: DEFAULT_SETTINGS.monthlyLimit,
      custom_categories: DEFAULT_SETTINGS.customCategories,
      updated_at: new Date().toISOString(),
    }

    const { data: created, error: insertError } = await supabase
      .from('settings')
      .insert(defaults)
      .select('*')
      .single()

    if (insertError) throw insertError
    return mapRow(created as SettingsRow)
  }

  async update(userId: string, input: UpdateSettingsInput): Promise<Settings> {
    const current = await this.get(userId)
    const payload = {
      user_id: userId,
      usd_white: input.usdWhite ?? current.usdWhite,
      usd_cash: input.usdCash ?? current.usdCash,
      monthly_limit: input.monthlyLimit ?? current.monthlyLimit,
      custom_categories: input.customCategories ?? current.customCategories,
      updated_at: new Date().toISOString(),
    }

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('settings')
      .upsert(payload)
      .select('*')
      .single()

    if (error) throw error
    return mapRow(data as SettingsRow)
  }
}
