import { describe, expect, it } from 'vitest'
import { AccountType, Category, Currency } from '@/types/enums'
import { IncomeSummaryCalculator } from './IncomeSummaryCalculator'
import { PERIOD_ID, testExpense, testIncome, testSettings } from '@/test/fixtures'

describe('IncomeSummaryCalculator', () => {
  it('calcula ingresos, gastos fijos/variables y ahorro', () => {
    const settings = testSettings()
    const incomes = [
      testIncome({
        periodId: PERIOD_ID,
        accountType: AccountType.WHITE,
        description: 'Salario',
        originalCurrency: Currency.USD,
        originalAmount: 1000,
      }),
      testIncome({
        periodId: PERIOD_ID,
        accountType: AccountType.CASH,
        description: 'Extra',
        originalCurrency: Currency.USD,
        originalAmount: 200,
      }),
    ]
    const expenses = [
      testExpense({
        periodId: PERIOD_ID,
        accountType: AccountType.WHITE,
        category: Category.SERVICIOS,
        originalAmount: 300,
      }),
      testExpense({
        periodId: PERIOD_ID,
        accountType: AccountType.WHITE,
        category: Category.OTHER,
        originalAmount: 100,
      }),
      testExpense({
        periodId: PERIOD_ID,
        accountType: AccountType.CASH,
        category: Category.GYM,
        originalAmount: 150,
      }),
      testExpense({
        periodId: PERIOD_ID,
        accountType: AccountType.CASH,
        category: Category.OTHER,
        originalAmount: 50,
      }),
    ]

    const summary = IncomeSummaryCalculator.calculate(
      incomes,
      expenses,
      settings.enabledFixedCategories,
      Currency.USD,
      { usdWhite: 1, usdCash: 1 },
    )

    expect(summary.totalIncome).toBe(1200)
    expect(summary.incomeWhite).toBe(1000)
    expect(summary.incomeCash).toBe(200)
    expect(summary.totalFixed).toBe(450)
    expect(summary.fixedWhite).toBe(300)
    expect(summary.fixedCash).toBe(150)
    expect(summary.totalVariable).toBe(150)
    expect(summary.variableWhite).toBe(100)
    expect(summary.variableCash).toBe(50)
    expect(summary.totalExpenses).toBe(600)
    expect(summary.savings).toBe(600)
    expect(summary.savingsWithoutVariable).toBe(750)
  })

  it('excluye categorías fijas deshabilitadas del total fijo', () => {
    const settings = testSettings({
      enabledFixedCategories: [Category.SUPER],
    })
    const expenses = [
      testExpense({
        category: Category.SUPER,
        originalAmount: 100,
      }),
      testExpense({
        category: Category.GYM,
        originalAmount: 200,
      }),
    ]

    const summary = IncomeSummaryCalculator.calculate(
      [],
      expenses,
      settings.enabledFixedCategories,
      Currency.USD,
      { usdWhite: 1, usdCash: 1 },
    )

    expect(summary.totalFixed).toBe(100)
    expect(summary.totalVariable).toBe(0)
    expect(summary.totalExpenses).toBe(100)
  })
})
