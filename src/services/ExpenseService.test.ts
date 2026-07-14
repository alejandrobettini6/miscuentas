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

  it('registra Otros sin nombre cuando la descripción está vacía', () => {
    const expense = ExpenseService.buildExpense(
      'u',
      {
        accountType: AccountType.WHITE,
        category: Category.OTHER,
        originalAmount: 200,
        originalCurrency: Currency.USD,
      },
      settings,
    )
    expect(expense.description).toBeNull()
  })

  it('acepta categoría personalizada opcional en Otros', () => {
    const expense = ExpenseService.buildExpense(
      'u',
      {
        accountType: AccountType.WHITE,
        category: Category.OTHER,
        description: '  Guitarra  ',
        originalAmount: 50,
        originalCurrency: Currency.USD,
      },
      settings,
    )
    expect(expense.description).toBe('Guitarra')
  })

  it('normaliza nombre de categoría personalizada', () => {
    const expense = ExpenseService.buildExpense(
      'u',
      {
        accountType: AccountType.CASH,
        category: Category.OTHER,
        description: '  Impuesto   pais  ',
        originalAmount: 300,
        originalCurrency: Currency.USD,
      },
      settings,
    )
    expect(expense.description).toBe('Impuesto pais')
    expect(expense.accountType).toBe(AccountType.CASH)
  })

  it('rechaza nombre de categoría demasiado largo', () => {
    expect(() =>
      ExpenseService.buildExpense(
        'u',
        {
          accountType: AccountType.WHITE,
          category: Category.OTHER,
          description: 'x'.repeat(41),
          originalAmount: 10,
          originalCurrency: Currency.USD,
        },
        settings,
      ),
    ).toThrow()
  })

  it('persiste Devoluciones con montos negativos', () => {
    const expense = ExpenseService.buildExpense(
      'u',
      {
        accountType: AccountType.WHITE,
        category: Category.REFUNDS,
        originalAmount: 80,
        originalCurrency: Currency.USD,
      },
      settings,
    )
    expect(expense.originalAmount).toBe(-80)
    expect(expense.usdAmount).toBe(-80)
  })

  it('recalcula Devoluciones en negativo al editar', () => {
    const created = ExpenseService.buildExpense(
      'u',
      {
        accountType: AccountType.WHITE,
        category: Category.REFUNDS,
        originalAmount: 40,
        originalCurrency: Currency.USD,
      },
      settings,
    )
    const updated = ExpenseService.updateExpense(
      created,
      { originalAmount: 25, originalCurrency: Currency.USD },
      settings,
    )
    expect(updated.originalAmount).toBe(-25)
    expect(updated.usdAmount).toBe(-25)
  })
})
