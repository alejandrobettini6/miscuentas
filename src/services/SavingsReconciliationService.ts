import { PeriodStatus } from '@/types/enums'
import type {
  CreateExpenseInput,
  Expense,
  Income,
  Period,
  Settings,
} from '@/types/models'
import {
  accountingAmount,
  resolveAccountingCurrency,
} from './AccountingCurrency'
import { ExpenseService } from './ExpenseService'
import { SavingsService } from './SavingsService'

export interface SavingsPeriodImpact {
  periodLabel: string
  delta: number
}

export interface SavingsLocationImpactPreview {
  name: string
  current: number
  impacts: SavingsPeriodImpact[]
  final: number
}

export interface SavingsMonthImpactPreview {
  periodId: string
  periodLabel: string
  tripExpenseTotal: number
  previousSavings: number
  newSavings: number
  delta: number
  location: string | null
  canAdjust: boolean
}

export interface TripSavingsImpactPreview {
  months: SavingsMonthImpactPreview[]
  locations: SavingsLocationImpactPreview[]
  reconcilePeriodIds: string[]
}

export class SavingsReconciliationService {
  static canReconcile(period: Period): boolean {
    return (
      period.status === PeriodStatus.CLOSED &&
      SavingsService.isPeriodSavingsComplete(period)
    )
  }

  static getAffectedClosedPeriods(
    mergeInputs: CreateExpenseInput[],
    periods: Period[],
  ): Period[] {
    const affectedIds = new Set(mergeInputs.map((input) => input.periodId))
    return periods.filter(
      (period) =>
        period.status === PeriodStatus.CLOSED && affectedIds.has(period.id),
    )
  }

  static inputsToExpenses(
    inputs: CreateExpenseInput[],
    settings: Settings,
  ): Expense[] {
    return inputs.map((input) =>
      ExpenseService.buildExpense(settings.userId, input, settings),
    )
  }

  static previewTripMergeImpact(
    mergeInputs: CreateExpenseInput[],
    periods: Period[],
    settings: Settings,
    incomes: Income[],
    expenses: Expense[],
  ): TripSavingsImpactPreview | null {
    if (mergeInputs.length === 0) return null

    const affectedClosed = this.getAffectedClosedPeriods(mergeInputs, periods)
    if (affectedClosed.length === 0) return null

    const simulated = [...expenses, ...this.inputsToExpenses(mergeInputs, settings)]
    const accountingCurrency = resolveAccountingCurrency(settings)
    const rates = { usdWhite: settings.usdWhite, usdCash: settings.usdCash }
    const builtByPeriod = new Map<string, Expense[]>()

    for (const input of mergeInputs) {
      const built = this.inputsToExpenses([input], settings)
      const list = builtByPeriod.get(input.periodId) ?? []
      list.push(...built)
      builtByPeriod.set(input.periodId, list)
    }

    const months: SavingsMonthImpactPreview[] = []
    const byLocation = new Map<string, SavingsLocationImpactPreview>()

    for (const period of affectedClosed) {
      const canAdjust = this.canReconcile(period)
      const currentSavings = SavingsService.calculatePeriodSavings(
        period.id,
        settings,
        incomes,
        expenses,
      )
      const newSavings = SavingsService.calculatePeriodSavings(
        period.id,
        settings,
        incomes,
        simulated,
      )
      const previousSavings = canAdjust
        ? period.savingsAppliedAmount!
        : currentSavings
      const delta = round(
        canAdjust ? newSavings - period.savingsAppliedAmount! : newSavings - currentSavings,
      )
      const tripExpenseTotal = round(
        (builtByPeriod.get(period.id) ?? []).reduce(
          (acc, expense) => acc + accountingAmount(expense, accountingCurrency, rates),
          0,
        ),
      )

      months.push({
        periodId: period.id,
        periodLabel: period.label,
        tripExpenseTotal,
        previousSavings,
        newSavings,
        delta,
        location: period.savingsAppliedLocation,
        canAdjust,
      })

      if (canAdjust && period.savingsAppliedLocation) {
        const location = period.savingsAppliedLocation
        const existing = byLocation.get(location) ?? {
          name: location,
          current: settings.savingsBalances[location] ?? 0,
          impacts: [],
          final: settings.savingsBalances[location] ?? 0,
        }
        existing.impacts.push({ periodLabel: period.label, delta })
        existing.final = round(existing.final + delta)
        byLocation.set(location, existing)
      }
    }

    return {
      months,
      locations: [...byLocation.values()],
      reconcilePeriodIds: months.filter((month) => month.canAdjust).map((month) => month.periodId),
    }
  }

  static reconcilePeriod(
    settings: Settings,
    period: Period,
    incomes: Income[],
    expenses: Expense[],
  ): { settings: Settings; period: Period } | null {
    if (!this.canReconcile(period)) return null

    const newSavings = SavingsService.calculatePeriodSavings(
      period.id,
      settings,
      incomes,
      expenses,
    )
    const delta = round(newSavings - period.savingsAppliedAmount!)
    const location = period.savingsAppliedLocation!

    if (delta === 0) {
      return {
        settings,
        period: { ...period, savingsAppliedAmount: newSavings },
      }
    }

    const current = settings.savingsBalances[location] ?? 0
    return {
      settings: {
        ...settings,
        savingsBalances: {
          ...settings.savingsBalances,
          [location]: round(current + delta),
        },
      },
      period: {
        ...period,
        savingsAppliedAmount: newSavings,
      },
    }
  }

  static reconcilePeriods(
    settings: Settings,
    periods: Period[],
    periodIds: string[],
    incomes: Income[],
    expenses: Expense[],
  ): { settings: Settings; periods: Period[] } {
    let nextSettings = settings
    const updated = new Map<string, Period>()

    for (const periodId of periodIds) {
      const period = periods.find((item) => item.id === periodId)
      if (!period) continue
      const result = this.reconcilePeriod(nextSettings, period, incomes, expenses)
      if (!result) continue
      nextSettings = result.settings
      updated.set(periodId, result.period)
    }

    return {
      settings: nextSettings,
      periods: periods.map((period) => updated.get(period.id) ?? period),
    }
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
