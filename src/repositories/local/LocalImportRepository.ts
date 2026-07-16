import type { ImportRepository, NormalizedImportPayload } from '../interfaces'
import { LocalExpenseRepository } from './LocalExpenseRepository'
import { LocalPeriodRepository } from './LocalPeriodRepository'
import { LocalSettingsRepository } from './LocalSettingsRepository'

export class LocalImportRepository implements ImportRepository {
  private settings = new LocalSettingsRepository()
  private periods = new LocalPeriodRepository()
  private expenses = new LocalExpenseRepository()

  async replaceAll(userId: string, payload: NormalizedImportPayload): Promise<void> {
    // Validamos el estado completo antes de sustituir.
    const settings = { ...payload.settings, userId }
    const periods = payload.periods.map((p) => ({ ...p, userId }))
    const expenses = payload.expenses.map((e) => ({ ...e, userId }))

    const previousSettings = await this.settings.get(userId)
    const previousPeriods = await this.periods.list(userId)
    const previousExpenses = await this.expenses.list(userId)

    try {
      await this.settings.update(userId, {
        usdWhite: settings.usdWhite,
        usdCash: settings.usdCash,
        monthlyLimit: settings.monthlyLimit,
        customCategories: settings.customCategories,
        enabledAccounts: settings.enabledAccounts,
        enabledCurrencies: settings.enabledCurrencies,
        enabledFixedCategories: settings.enabledFixedCategories,
        monthMode: settings.monthMode,
        onboardingCompleted: settings.onboardingCompleted,
      })
      await this.periods.replaceAll(userId, periods)
      await this.expenses.replaceAll(userId, expenses)
    } catch (error) {
      await this.settings.update(userId, {
        usdWhite: previousSettings.usdWhite,
        usdCash: previousSettings.usdCash,
        monthlyLimit: previousSettings.monthlyLimit,
        customCategories: previousSettings.customCategories,
        enabledAccounts: previousSettings.enabledAccounts,
        enabledCurrencies: previousSettings.enabledCurrencies,
        enabledFixedCategories: previousSettings.enabledFixedCategories,
        monthMode: previousSettings.monthMode,
        onboardingCompleted: previousSettings.onboardingCompleted,
      })
      await this.periods.replaceAll(userId, previousPeriods)
      await this.expenses.replaceAll(userId, previousExpenses)
      throw error
    }
  }
}
