import { describe, expect, it } from 'vitest'
import { Currency } from '@/types/enums'
import { PERIOD_ID, testExpense, testIncome, testSettings } from '@/test/fixtures'
import { SavingsService } from './SavingsService'
import { PeriodStatus } from '@/types/enums'

const basePeriod = {
  id: 'p1',
  userId: 'u',
  label: 'Ago 2026',
  yearMonth: '2026-08',
  status: PeriodStatus.ACTIVE,
  startedAt: new Date().toISOString(),
  closedAt: null,
  monthlyLimitSnapshot: null,
  savingsAppliedAt: null,
  savingsAppliedAmount: null,
  savingsAppliedLocation: null,
}

describe('SavingsService', () => {
  it('agrega cajita con balance inicial cero', () => {
    const next = SavingsService.addLocation(testSettings(), 'Wallbit')
    expect(next.savingsLocations).toContain('Wallbit')
    expect(next.savingsBalances.Wallbit).toBe(0)
  })

  it('aplica ahorro del período a una cajita y guarda snapshot', () => {
    const settings = testSettings({
      savingsLocations: ['Wallbit'],
      savingsBalances: { Wallbit: 1000 },
    })
    const result = SavingsService.applyPeriodSavings(
      settings,
      basePeriod,
      800,
      'Wallbit',
    )
    expect(result.settings.savingsBalances.Wallbit).toBe(1800)
    expect(result.period.savingsAppliedAt).not.toBeNull()
    expect(result.period.savingsAppliedAmount).toBe(800)
    expect(result.period.savingsAppliedLocation).toBe('Wallbit')
  })

  it('calculatePeriodSavings usa moneda contable resuelta (solo ARS)', () => {
    const settings = testSettings({
      enabledCurrencies: [Currency.ARS],
      accountingCurrency: Currency.USD,
      usdWhite: 1000,
      usdCash: 1000,
    })
    const incomes = [
      testIncome({
        periodId: PERIOD_ID,
        originalCurrency: Currency.ARS,
        originalAmount: 5000,
        exchangeRate: 1000,
        usdAmount: 5,
      }),
    ]
    const expenses = [
      testExpense({
        periodId: PERIOD_ID,
        originalCurrency: Currency.ARS,
        originalAmount: 4000,
        exchangeRate: 1000,
        usdAmount: 4,
      }),
    ]

    expect(
      SavingsService.calculatePeriodSavings(PERIOD_ID, settings, incomes, expenses),
    ).toBe(1000)
  })

  it('completa ahorro parcial cuando solo quedó savingsAppliedAt', () => {
    const settings = testSettings({
      savingsLocations: ['Wallbit'],
      savingsBalances: { Wallbit: 1000 },
    })
    const partialPeriod = {
      ...basePeriod,
      savingsAppliedAt: new Date().toISOString(),
      savingsAppliedAmount: null,
      savingsAppliedLocation: null,
    }
    const result = SavingsService.applyPeriodSavings(
      settings,
      partialPeriod,
      800,
      'Wallbit',
    )
    expect(result.settings.savingsBalances.Wallbit).toBe(1800)
    expect(result.period.savingsAppliedAmount).toBe(800)
    expect(result.period.savingsAppliedLocation).toBe('Wallbit')
  })

  it('detecta snapshot completo de ahorro del período', () => {
    expect(
      SavingsService.isPeriodSavingsComplete({
        ...basePeriod,
        savingsAppliedAt: new Date().toISOString(),
        savingsAppliedAmount: 500,
        savingsAppliedLocation: 'Wallbit',
      }),
    ).toBe(true)
    expect(
      SavingsService.isPeriodSavingsComplete({
        ...basePeriod,
        savingsAppliedAt: new Date().toISOString(),
        savingsAppliedAmount: null,
        savingsAppliedLocation: null,
      }),
    ).toBe(false)
  })

  it('aplica déficit del mes restando de la cajita', () => {
    const settings = testSettings({
      savingsLocations: ['Wallbit'],
      savingsBalances: { Wallbit: 3000 },
    })
    const result = SavingsService.applyPeriodSavings(
      settings,
      basePeriod,
      -1000,
      'Wallbit',
    )
    expect(result.settings.savingsBalances.Wallbit).toBe(2000)
    expect(result.period.savingsAppliedAmount).toBe(-1000)
    expect(result.period.savingsAppliedLocation).toBe('Wallbit')
  })

  it('no permite eliminar cajita con saldo', () => {
    expect(() =>
      SavingsService.removeLocation(
        testSettings({
          savingsLocations: ['Cash'],
          savingsBalances: { Cash: 100 },
        }),
        'Cash',
      ),
    ).toThrow()
  })
})
