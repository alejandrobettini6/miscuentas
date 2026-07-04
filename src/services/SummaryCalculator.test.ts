import { describe, expect, it } from 'vitest'
import { AccountType, BudgetColor, Category, Currency } from '@/types/enums'
import type { Expense } from '@/types/models'
import { SummaryCalculator } from './SummaryCalculator'

function expense(partial: Partial<Expense> & Pick<Expense, 'accountType' | 'usdAmount'>): Expense {
  return {
    id: '1',
    userId: 'u',
    category: Category.SUPER,
    description: null,
    originalCurrency: Currency.USD,
    originalAmount: partial.usdAmount,
    exchangeRate: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  }
}

describe('SummaryCalculator', () => {
  it('suma blanco y barrani por separado y en total', () => {
    const expenses = [
      expense({ accountType: AccountType.WHITE, usdAmount: 100 }),
      expense({ accountType: AccountType.CASH, usdAmount: 50 }),
    ]
    const summary = SummaryCalculator.calculate(expenses, 200)
    expect(summary.totalWhite).toBe(100)
    expect(summary.totalCash).toBe(50)
    expect(summary.totalSpent).toBe(150)
    expect(summary.available).toBe(50)
    expect(summary.remainingPercent).toBe(25)
  })

  it('resuelve colores del indicador', () => {
    expect(SummaryCalculator.resolveBudgetColor(25, 100)).toBe(BudgetColor.GREEN)
    expect(SummaryCalculator.resolveBudgetColor(15, 100)).toBe(BudgetColor.YELLOW)
    expect(SummaryCalculator.resolveBudgetColor(5, 100)).toBe(BudgetColor.ORANGE)
    expect(SummaryCalculator.resolveBudgetColor(0, -1)).toBe(BudgetColor.RED)
  })
})
