import { getDataMode } from '@/config/env'
import { LocalAuthRepository } from './local/LocalAuthRepository'
import { LocalExpenseRepository } from './local/LocalExpenseRepository'
import { LocalSettingsRepository } from './local/LocalSettingsRepository'
import { SupabaseAuthRepository } from './supabase/SupabaseAuthRepository'
import { SupabaseExpenseRepository } from './supabase/SupabaseExpenseRepository'
import { SupabaseSettingsRepository } from './supabase/SupabaseSettingsRepository'
import type { AuthRepository, ExpenseRepository, SettingsRepository } from './interfaces'

let authRepo: AuthRepository | null = null
let settingsRepo: SettingsRepository | null = null
let expenseRepo: ExpenseRepository | null = null

export function getAuthRepository(): AuthRepository {
  if (!authRepo) {
    authRepo =
      getDataMode() === 'supabase'
        ? new SupabaseAuthRepository()
        : new LocalAuthRepository()
  }
  return authRepo
}

export function getSettingsRepository(): SettingsRepository {
  if (!settingsRepo) {
    settingsRepo =
      getDataMode() === 'supabase'
        ? new SupabaseSettingsRepository()
        : new LocalSettingsRepository()
  }
  return settingsRepo
}

export function getExpenseRepository(): ExpenseRepository {
  if (!expenseRepo) {
    expenseRepo =
      getDataMode() === 'supabase'
        ? new SupabaseExpenseRepository()
        : new LocalExpenseRepository()
  }
  return expenseRepo
}
