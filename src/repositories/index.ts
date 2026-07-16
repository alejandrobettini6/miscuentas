import { getDataMode } from '@/config/env'
import { LocalAuthRepository } from './local/LocalAuthRepository'
import { LocalExpenseRepository } from './local/LocalExpenseRepository'
import { LocalImportRepository } from './local/LocalImportRepository'
import { LocalPeriodRepository } from './local/LocalPeriodRepository'
import { LocalSettingsRepository } from './local/LocalSettingsRepository'
import { SupabaseAuthRepository } from './supabase/SupabaseAuthRepository'
import { SupabaseExpenseRepository } from './supabase/SupabaseExpenseRepository'
import { SupabaseImportRepository } from './supabase/SupabaseImportRepository'
import { SupabasePeriodRepository } from './supabase/SupabasePeriodRepository'
import { SupabaseSettingsRepository } from './supabase/SupabaseSettingsRepository'
import type {
  AuthRepository,
  ExpenseRepository,
  ImportRepository,
  PeriodRepository,
  SettingsRepository,
} from './interfaces'

let authRepo: AuthRepository | null = null
let settingsRepo: SettingsRepository | null = null
let expenseRepo: ExpenseRepository | null = null
let periodRepo: PeriodRepository | null = null
let importRepo: ImportRepository | null = null

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

export function getPeriodRepository(): PeriodRepository {
  if (!periodRepo) {
    periodRepo =
      getDataMode() === 'supabase'
        ? new SupabasePeriodRepository()
        : new LocalPeriodRepository()
  }
  return periodRepo
}

export function getImportRepository(): ImportRepository {
  if (!importRepo) {
    importRepo =
      getDataMode() === 'supabase'
        ? new SupabaseImportRepository()
        : new LocalImportRepository()
  }
  return importRepo
}
