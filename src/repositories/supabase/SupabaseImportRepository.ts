import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ImportRepository, NormalizedImportPayload } from '../interfaces'

export class SupabaseImportRepository implements ImportRepository {
  async replaceAll(userId: string, payload: NormalizedImportPayload): Promise<void> {
    const supabase = getSupabaseClient()
    const body = {
      settings: {
        usdWhite: payload.settings.usdWhite,
        usdCash: payload.settings.usdCash,
        monthlyLimit: payload.settings.monthlyLimit,
        customCategories: payload.settings.customCategories,
        enabledAccounts: payload.settings.enabledAccounts,
        enabledCurrencies: payload.settings.enabledCurrencies,
        enabledFixedCategories: payload.settings.enabledFixedCategories,
        monthMode: payload.settings.monthMode,
        onboardingCompleted: payload.settings.onboardingCompleted,
      },
      periods: payload.periods.map((p) => ({
        id: p.id,
        label: p.label,
        yearMonth: p.yearMonth,
        status: p.status,
        startedAt: p.startedAt,
        closedAt: p.closedAt,
        monthlyLimitSnapshot: p.monthlyLimitSnapshot,
      })),
      expenses: payload.expenses.map((e) => ({
        id: e.id,
        periodId: e.periodId,
        accountType: e.accountType,
        category: e.category,
        description: e.description,
        originalCurrency: e.originalCurrency,
        originalAmount: e.originalAmount,
        exchangeRate: e.exchangeRate,
        usdAmount: e.usdAmount,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
    }

    const { error } = await supabase.rpc('replace_user_accounts', { payload: body })
    if (error) {
      // Fallback no atómico si la RPC aún no existe: igual intentamos preservar orden.
      if (error.message.includes('replace_user_accounts')) {
        throw new Error(
          'Falta ejecutar la migración de importación en Supabase (replace_user_accounts)',
        )
      }
      throw error
    }
    void userId
  }
}
