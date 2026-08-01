import { describe, expect, it } from 'vitest'
import { AccountType, Currency } from '@/types/enums'
import { IncomeAggregator } from './IncomeAggregator'
import { PERIOD_ID, testIncome } from '@/test/fixtures'

describe('IncomeAggregator', () => {
  it('agrupa ingresos por cuenta y calcula totales', () => {
    const incomes = [
      testIncome({
        periodId: PERIOD_ID,
        originalAmount: 1000,
        accountType: AccountType.WHITE,
      }),
      testIncome({
        periodId: PERIOD_ID,
        originalAmount: 200,
        accountType: AccountType.WHITE,
      }),
      testIncome({
        periodId: PERIOD_ID,
        originalAmount: 500,
        accountType: AccountType.CASH,
      }),
    ]

    const rows = IncomeAggregator.buildRows(
      incomes,
      [AccountType.WHITE, AccountType.CASH],
      Currency.USD,
      { usdWhite: 1, usdCash: 1 },
    )

    expect(rows).toHaveLength(2)
    const blanco = rows.find((row) => row.accountType === AccountType.WHITE)
    const negro = rows.find((row) => row.accountType === AccountType.CASH)
    expect(blanco?.totalUsd).toBe(1200)
    expect(blanco?.lastIncome).not.toBeNull()
    expect(negro?.totalUsd).toBe(500)
  })

  it('incluye cuentas habilitadas aunque no tengan ingresos', () => {
    const rows = IncomeAggregator.buildRows([], [AccountType.WHITE], Currency.USD)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.accountType).toBe(AccountType.WHITE)
    expect(rows[0]?.totalUsd).toBe(0)
    expect(rows[0]?.lastIncome).toBeNull()
  })
})
