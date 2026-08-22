import { describe, expect, it } from 'vitest'
import { SavingsSummaryCalculator } from './SavingsSummaryCalculator'
import { testSettings } from '@/test/fixtures'

describe('SavingsSummaryCalculator', () => {
  it('suma balances y ordena con saldo primero', () => {
    const summary = SavingsSummaryCalculator.calculate(
      testSettings({
        savingsLocations: ['Nexo', 'Cash', 'Wallbit'],
        savingsBalances: { Cash: 10000, Wallbit: 2000, Nexo: 0 },
      }),
    )

    expect(summary.totalSaved).toBe(12000)
    expect(summary.byLocation.map((row) => row.name)).toEqual([
      'Cash',
      'Wallbit',
      'Nexo',
    ])
  })
})
