import { describe, expect, it } from 'vitest'
import { AccountType, Category, Currency } from '@/types/enums'
import type { Settings } from '@/types/models'
import { ExpenseService } from './ExpenseService'

const settings: Settings = {
  userId: 'u',
  usdWhite: 1000,
  usdCash: 1200,
  monthlyLimit: 1500,
  updatedAt: new Date().toISOString(),
}

describe('ExpenseService', () => {
  it('guarda cotización histórica al crear en ARS', () => {
    const expense = ExpenseService.buildExpense(
      'u',
      {
        accountType: AccountType.WHITE,
        category: Category.SUPER,
        originalAmount: 2000,
        originalCurrency: Currency.ARS,
      },
      settings,
    )

    expect(expense.exchangeRate).toBe(1000)
    expect(expense.usdAmount).toBe(2)
  })

  it('registra Otros sin nombre si es <= 150 USD', () => {
    const expense = ExpenseService.buildExpense(
      'u',
      {
        accountType: AccountType.WHITE,
        category: Category.OTHER,
        originalAmount: 150,
        originalCurrency: Currency.USD,
      },
      settings,
    )
    expect(expense.description).toBeNull()
  })

  it('exige nombre para Otros Grandes', () => {
    expect(() =>
      ExpenseService.buildExpense(
        'u',
        {
          accountType: AccountType.WHITE,
          category: Category.OTHER,
          originalAmount: 151,
          originalCurrency: Currency.USD,
        },
        settings,
      ),
    ).toThrow()
  })

  it('acumula nombre normalizado en Otros Grandes', () => {
    const expense = ExpenseService.buildExpense(
      'u',
      {
        accountType: AccountType.CASH,
        category: Category.OTHER,
        description: '  Guitarra  ',
        originalAmount: 300,
        originalCurrency: Currency.USD,
      },
      settings,
    )
    expect(expense.description).toBe('Guitarra')
    expect(expense.accountType).toBe(AccountType.CASH)
  })
})
