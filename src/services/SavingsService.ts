import type { Expense, Income, Period, Settings } from '@/types/models'
import {
  isValidCustomCategoryName,
  normalizeCustomCategoryName,
} from '@/validators/amount'
import { IncomeSummaryCalculator } from './IncomeSummaryCalculator'
import { resolveAccountingCurrency } from './AccountingCurrency'

export class SavingsService {
  static addLocation(settings: Settings, name: string): Settings {
    const normalized = normalizeCustomCategoryName(name)
    if (!isValidCustomCategoryName(normalized)) {
      throw new Error('Nombre de cajita inválido')
    }
    const exists = settings.savingsLocations.some(
      (loc) => loc.toLowerCase() === normalized.toLowerCase(),
    )
    if (exists) {
      throw new Error('Ya existe una cajita con ese nombre')
    }
    return {
      ...settings,
      savingsLocations: [...settings.savingsLocations, normalized],
      savingsBalances: {
        ...settings.savingsBalances,
        [normalized]: settings.savingsBalances[normalized] ?? 0,
      },
    }
  }

  static renameLocation(
    settings: Settings,
    oldName: string,
    newName: string,
  ): Settings {
    const normalized = normalizeCustomCategoryName(newName)
    if (!isValidCustomCategoryName(normalized)) {
      throw new Error('Nombre de cajita inválido')
    }
    if (
      settings.savingsLocations.some(
        (loc) =>
          loc.toLowerCase() === normalized.toLowerCase() &&
          loc.toLowerCase() !== oldName.toLowerCase(),
      )
    ) {
      throw new Error('Ya existe una cajita con ese nombre')
    }

    const savingsLocations = settings.savingsLocations.map((loc) =>
      loc === oldName ? normalized : loc,
    )
    const savingsBalances = { ...settings.savingsBalances }
    if (Object.prototype.hasOwnProperty.call(savingsBalances, oldName)) {
      savingsBalances[normalized] = savingsBalances[oldName]
      delete savingsBalances[oldName]
    }
    return { ...settings, savingsLocations, savingsBalances }
  }

  static removeLocation(settings: Settings, name: string): Settings {
    const balance = settings.savingsBalances[name] ?? 0
    if (balance !== 0) {
      throw new Error('Solo podés eliminar cajitas con saldo $0')
    }
    const savingsLocations = settings.savingsLocations.filter((loc) => loc !== name)
    const savingsBalances = { ...settings.savingsBalances }
    delete savingsBalances[name]
    return { ...settings, savingsLocations, savingsBalances }
  }

  static setLocationBalance(
    settings: Settings,
    name: string,
    amount: number,
  ): Settings {
    if (!settings.savingsLocations.includes(name)) {
      throw new Error('Cajita no encontrada')
    }
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error('Monto inválido')
    }
    return {
      ...settings,
      savingsBalances: {
        ...settings.savingsBalances,
        [name]: round(amount),
      },
    }
  }

  static isPeriodSavingsComplete(period: Period): boolean {
    return (
      period.savingsAppliedAt != null &&
      period.savingsAppliedAmount != null &&
      period.savingsAppliedLocation != null
    )
  }

  static applyPeriodSavings(
    settings: Settings,
    period: Period,
    amount: number,
    locationName: string,
    now = new Date(),
  ): { settings: Settings; period: Period } {
    if (this.isPeriodSavingsComplete(period)) {
      throw new Error('El ahorro de este período ya fue aplicado')
    }
    if (!Number.isFinite(amount)) {
      throw new Error('Monto inválido')
    }
    if (!settings.savingsLocations.includes(locationName)) {
      throw new Error('Cajita no encontrada')
    }

    const rounded = round(amount)
    const current = settings.savingsBalances[locationName] ?? 0
    return {
      settings: {
        ...settings,
        savingsBalances: {
          ...settings.savingsBalances,
          [locationName]: round(current + rounded),
        },
      },
      period: {
        ...period,
        savingsAppliedAt: period.savingsAppliedAt ?? now.toISOString(),
        savingsAppliedAmount: rounded,
        savingsAppliedLocation: locationName,
      },
    }
  }

  static calculatePeriodSavings(
    periodId: string,
    settings: Settings,
    incomes: Income[],
    expenses: Expense[],
  ): number {
    const periodIncomes = incomes.filter((item) => item.periodId === periodId)
    const periodExpenses = expenses.filter((item) => item.periodId === periodId)
    const accountingCurrency = resolveAccountingCurrency(settings)
    return IncomeSummaryCalculator.calculate(
      periodIncomes,
      periodExpenses,
      settings.enabledFixedCategories,
      accountingCurrency,
      { usdWhite: settings.usdWhite, usdCash: settings.usdCash },
    ).savings
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
