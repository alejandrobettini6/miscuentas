import type { ImportRepository, NormalizedImportPayload } from '../interfaces'
import { LocalExpenseRepository } from './LocalExpenseRepository'
import { LocalIncomeRepository } from './LocalIncomeRepository'
import { LocalPeriodRepository } from './LocalPeriodRepository'
import { LocalSettingsRepository } from './LocalSettingsRepository'

export class LocalImportRepository implements ImportRepository {
  private settings = new LocalSettingsRepository()
  private periods = new LocalPeriodRepository()
  private expenses = new LocalExpenseRepository()
  private incomes = new LocalIncomeRepository()

  async replaceAll(userId: string, payload: NormalizedImportPayload): Promise<void> {
    // Validamos el estado completo antes de sustituir.
    const settings = { ...payload.settings, userId }
    const periods = payload.periods.map((p) => ({ ...p, userId }))
    const expenses = payload.expenses.map((e) => ({ ...e, userId }))
    const incomes = payload.incomes.map((i) => ({ ...i, userId }))

    const previousSettings = await this.settings.get(userId)
    const previousPeriods = await this.periods.list(userId)
    const previousExpenses = await this.expenses.list(userId)
    const previousIncomes = await this.incomes.list(userId)

    try {
      await this.settings.update(userId, {
        usdWhite: settings.usdWhite,
        usdCash: settings.usdCash,
        monthlyLimit: settings.monthlyLimit,
        customCategories: settings.customCategories,
        incomeSources: settings.incomeSources,
        enabledAccounts: settings.enabledAccounts,
        enabledCurrencies: settings.enabledCurrencies,
        enabledFixedCategories: settings.enabledFixedCategories,
        monthMode: settings.monthMode,
        accountingCurrency: settings.accountingCurrency,
        summaryDisplayMode: settings.summaryDisplayMode,
        onboardingCompleted: settings.onboardingCompleted,
      })
      await this.periods.replaceAll(userId, periods)
      await this.expenses.replaceAll(userId, expenses)
      await this.incomes.replaceAll(userId, incomes)
    } catch (error) {
      await this.settings.update(userId, {
        usdWhite: previousSettings.usdWhite,
        usdCash: previousSettings.usdCash,
        monthlyLimit: previousSettings.monthlyLimit,
        customCategories: previousSettings.customCategories,
        incomeSources: previousSettings.incomeSources,
        enabledAccounts: previousSettings.enabledAccounts,
        enabledCurrencies: previousSettings.enabledCurrencies,
        enabledFixedCategories: previousSettings.enabledFixedCategories,
        monthMode: previousSettings.monthMode,
        accountingCurrency: previousSettings.accountingCurrency,
        summaryDisplayMode: previousSettings.summaryDisplayMode,
        onboardingCompleted: previousSettings.onboardingCompleted,
      })
      await this.periods.replaceAll(userId, previousPeriods)
      await this.expenses.replaceAll(userId, previousExpenses)
      await this.incomes.replaceAll(userId, previousIncomes)
      throw error
    }
  }
}
