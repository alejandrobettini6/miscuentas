import { describe, expect, it } from 'vitest'
import { AccountType, Category, Currency, PeriodStatus } from '@/types/enums'
import type { CreateExpenseInput, Period } from '@/types/models'
import { PERIOD_ID, testExpense, testIncome, testSettings } from '@/test/fixtures'
import { SavingsReconciliationService } from './SavingsReconciliationService'

const PERIOD_ID_SEP = '22222222-2222-4222-8222-222222222222'

const closedPeriod = (partial: Partial<Period> = {}): Period => ({
  id: PERIOD_ID,
  userId: 'u',
  label: 'Ago 2026',
  yearMonth: '2026-08',
  status: PeriodStatus.CLOSED,
  startedAt: new Date().toISOString(),
  closedAt: new Date().toISOString(),
  monthlyLimitSnapshot: null,
  savingsAppliedAt: new Date().toISOString(),
  savingsAppliedAmount: 1000,
  savingsAppliedLocation: 'Wallbit',
  ...partial,
})

const closedPeriodSep = (partial: Partial<Period> = {}): Period => ({
  id: PERIOD_ID_SEP,
  userId: 'u',
  label: 'Sep 2026',
  yearMonth: '2026-09',
  status: PeriodStatus.CLOSED,
  startedAt: new Date().toISOString(),
  closedAt: new Date().toISOString(),
  monthlyLimitSnapshot: null,
  savingsAppliedAt: new Date().toISOString(),
  savingsAppliedAmount: 500,
  savingsAppliedLocation: 'Wallbit',
  ...partial,
})

describe('SavingsReconciliationService', () => {
  it('preview muestra impacto por mes y cajita cuando merge cae en mes cerrado', () => {
    const settings = testSettings({
      savingsLocations: ['Wallbit'],
      savingsBalances: { Wallbit: 2000 },
      enabledCurrencies: [Currency.ARS],
    })
    const period = closedPeriod()
    const incomes = [
      testIncome({
        periodId: period.id,
        originalCurrency: Currency.ARS,
        originalAmount: 5000,
        exchangeRate: 1000,
        usdAmount: 5,
      }),
    ]
    const expenses = [
      testExpense({
        periodId: period.id,
        originalCurrency: Currency.ARS,
        originalAmount: 4000,
        exchangeRate: 1000,
        usdAmount: 4,
      }),
    ]
    const mergeInputs: CreateExpenseInput[] = [
      {
        periodId: period.id,
        accountType: AccountType.WHITE,
        category: Category.OTHER,
        description: 'Viaje',
        originalCurrency: Currency.ARS,
        originalAmount: 200,
      },
    ]

    const preview = SavingsReconciliationService.previewTripMergeImpact(
      mergeInputs,
      [period],
      settings,
      incomes,
      expenses,
    )

    expect(preview).not.toBeNull()
    expect(preview!.months).toHaveLength(1)
    expect(preview!.months[0]).toMatchObject({
      periodLabel: 'Ago 2026',
      tripExpenseTotal: 200,
      previousSavings: 1000,
      newSavings: 800,
      delta: -200,
      canAdjust: true,
    })
    expect(preview!.locations).toHaveLength(1)
    expect(preview!.locations[0]).toMatchObject({
      name: 'Wallbit',
      current: 2000,
      final: 1800,
    })
    expect(preview!.reconcilePeriodIds).toEqual([period.id])
  })

  it('preview lista dos meses cerrados y agrupa impactos en la misma cajita', () => {
    const settings = testSettings({
      savingsLocations: ['Wallbit'],
      savingsBalances: { Wallbit: 3000 },
      enabledCurrencies: [Currency.ARS],
    })
    const aug = closedPeriod()
    const sep = closedPeriodSep()
    const incomes = [
      testIncome({
        periodId: aug.id,
        originalCurrency: Currency.ARS,
        originalAmount: 5000,
        exchangeRate: 1000,
        usdAmount: 5,
      }),
      testIncome({
        periodId: sep.id,
        originalCurrency: Currency.ARS,
        originalAmount: 3000,
        exchangeRate: 1000,
        usdAmount: 3,
      }),
    ]
    const expenses = [
      testExpense({
        periodId: aug.id,
        originalCurrency: Currency.ARS,
        originalAmount: 4000,
        exchangeRate: 1000,
        usdAmount: 4,
      }),
      testExpense({
        periodId: sep.id,
        originalCurrency: Currency.ARS,
        originalAmount: 2500,
        exchangeRate: 1000,
        usdAmount: 2.5,
      }),
    ]
    const mergeInputs: CreateExpenseInput[] = [
      {
        periodId: aug.id,
        accountType: AccountType.WHITE,
        category: Category.OTHER,
        description: 'Viaje',
        originalCurrency: Currency.ARS,
        originalAmount: 200,
      },
      {
        periodId: sep.id,
        accountType: AccountType.WHITE,
        category: Category.OTHER,
        description: 'Viaje',
        originalCurrency: Currency.ARS,
        originalAmount: 100,
      },
    ]

    const preview = SavingsReconciliationService.previewTripMergeImpact(
      mergeInputs,
      [aug, sep],
      settings,
      incomes,
      expenses,
    )

    expect(preview!.months).toHaveLength(2)
    expect(preview!.reconcilePeriodIds).toEqual([aug.id, sep.id])
    expect(preview!.locations[0].impacts).toHaveLength(2)
    expect(preview!.locations[0].final).toBe(2700)
  })

  it('preview incluye mes cerrado sin snapshot con canAdjust false', () => {
    const settings = testSettings({
      savingsLocations: ['Wallbit'],
      savingsBalances: { Wallbit: 2000 },
      enabledCurrencies: [Currency.ARS],
    })
    const period = closedPeriod({
      savingsAppliedAmount: null,
      savingsAppliedLocation: null,
    })
    const incomes = [
      testIncome({
        periodId: period.id,
        originalCurrency: Currency.ARS,
        originalAmount: 5000,
        exchangeRate: 1000,
        usdAmount: 5,
      }),
    ]
    const expenses = [
      testExpense({
        periodId: period.id,
        originalCurrency: Currency.ARS,
        originalAmount: 4000,
        exchangeRate: 1000,
        usdAmount: 4,
      }),
    ]
    const mergeInputs: CreateExpenseInput[] = [
      {
        periodId: period.id,
        accountType: AccountType.WHITE,
        category: Category.OTHER,
        description: 'Viaje',
        originalCurrency: Currency.ARS,
        originalAmount: 200,
      },
    ]

    const preview = SavingsReconciliationService.previewTripMergeImpact(
      mergeInputs,
      [period],
      settings,
      incomes,
      expenses,
    )

    expect(preview).not.toBeNull()
    expect(preview!.months[0].canAdjust).toBe(false)
    expect(preview!.reconcilePeriodIds).toEqual([])
    expect(preview!.locations).toHaveLength(0)
  })

  it('reconcile aplica delta a cajita y actualiza savingsAppliedAmount', () => {
    const settings = testSettings({
      savingsLocations: ['Wallbit'],
      savingsBalances: { Wallbit: 2000 },
      enabledCurrencies: [Currency.ARS],
    })
    const period = closedPeriod({ savingsAppliedAmount: 1000 })
    const incomes = [
      testIncome({
        periodId: period.id,
        originalCurrency: Currency.ARS,
        originalAmount: 5000,
        exchangeRate: 1000,
        usdAmount: 5,
      }),
    ]
    const expenses = [
      testExpense({
        periodId: period.id,
        originalCurrency: Currency.ARS,
        originalAmount: 4200,
        exchangeRate: 1000,
        usdAmount: 4.2,
      }),
    ]

    const result = SavingsReconciliationService.reconcilePeriod(
      settings,
      period,
      incomes,
      expenses,
    )

    expect(result).not.toBeNull()
    expect(result!.settings.savingsBalances.Wallbit).toBe(1800)
    expect(result!.period.savingsAppliedAmount).toBe(800)
  })

  it('reconcilePeriods actualiza balances tras merge simulado', () => {
    const settings = testSettings({
      savingsLocations: ['Wallbit'],
      savingsBalances: { Wallbit: 2000 },
      enabledCurrencies: [Currency.ARS],
    })
    const period = closedPeriod()
    const incomes = [
      testIncome({
        periodId: period.id,
        originalCurrency: Currency.ARS,
        originalAmount: 5000,
        exchangeRate: 1000,
        usdAmount: 5,
      }),
    ]
    const baseExpenses = [
      testExpense({
        periodId: period.id,
        originalCurrency: Currency.ARS,
        originalAmount: 4000,
        exchangeRate: 1000,
        usdAmount: 4,
      }),
    ]
    const mergedExpenses = [
      ...baseExpenses,
      testExpense({
        periodId: period.id,
        originalCurrency: Currency.ARS,
        originalAmount: 200,
        exchangeRate: 1000,
        usdAmount: 0.2,
      }),
    ]

    const result = SavingsReconciliationService.reconcilePeriods(
      settings,
      [period],
      [period.id],
      incomes,
      mergedExpenses,
    )

    expect(result.settings.savingsBalances.Wallbit).toBe(1800)
    expect(result.periods[0].savingsAppliedAmount).toBe(800)
  })

  it('reconcile con snapshot negativo resta de la cajita al agregar gastos', () => {
    const settings = testSettings({
      savingsLocations: ['Wallbit'],
      savingsBalances: { Wallbit: 3000 },
      enabledCurrencies: [Currency.ARS],
    })
    const period = closedPeriod({ savingsAppliedAmount: -1000 })
    const incomes = [
      testIncome({
        periodId: period.id,
        originalCurrency: Currency.ARS,
        originalAmount: 2000,
        exchangeRate: 1000,
        usdAmount: 2,
      }),
    ]
    const expenses = [
      testExpense({
        periodId: period.id,
        originalCurrency: Currency.ARS,
        originalAmount: 3000,
        exchangeRate: 1000,
        usdAmount: 3,
      }),
      testExpense({
        periodId: period.id,
        originalCurrency: Currency.ARS,
        originalAmount: 1000,
        exchangeRate: 1000,
        usdAmount: 1,
        description: 'Viaje Europa',
        category: Category.OTHER,
      }),
    ]

    const result = SavingsReconciliationService.reconcilePeriod(
      settings,
      period,
      incomes,
      expenses,
    )

    expect(result).not.toBeNull()
    expect(result!.settings.savingsBalances.Wallbit).toBe(2000)
    expect(result!.period.savingsAppliedAmount).toBe(-2000)
  })

  it('no reconcilia períodos legacy sin amount/location', () => {
    const period = closedPeriod({
      savingsAppliedAmount: null,
      savingsAppliedLocation: null,
    })
    expect(SavingsReconciliationService.canReconcile(period)).toBe(false)
  })

  it('preview es null si merge no cae en meses cerrados', () => {
    const activePeriod: Period = {
      ...closedPeriod(),
      id: 'active',
      status: PeriodStatus.ACTIVE,
      closedAt: null,
      savingsAppliedAt: null,
      savingsAppliedAmount: null,
      savingsAppliedLocation: null,
    }
    const mergeInputs: CreateExpenseInput[] = [
      {
        periodId: activePeriod.id,
        accountType: AccountType.WHITE,
        category: Category.OTHER,
        originalCurrency: Currency.ARS,
        originalAmount: 100,
      },
    ]

    const preview = SavingsReconciliationService.previewTripMergeImpact(
      mergeInputs,
      [activePeriod],
      testSettings(),
      [],
      [],
    )

    expect(preview).toBeNull()
  })
})
