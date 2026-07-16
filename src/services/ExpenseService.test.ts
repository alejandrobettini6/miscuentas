import { describe, expect, it } from 'vitest'
import { AccountType, Category, Currency } from '@/types/enums'
import { PERIOD_ID, testSettings } from '@/test/fixtures'
import { ExpenseService } from './ExpenseService'

const settings = testSettings({ usdWhite: 1000, usdCash: 1200 })

describe('ExpenseService', () => {
  it('guarda cotización histórica al crear en ARS', () => {
    const expense = ExpenseService.buildExpense(
      'u',
      {
        periodId: PERIOD_ID,
        accountType: AccountType.WHITE,
        category: Category.SUPER,
        originalAmount: 2000,
        originalCurrency: Currency.ARS,
      },
      settings,
    )

    expect(expense.exchangeRate).toBe(1000)
    expect(expense.usdAmount).toBe(2)
    expect(expense.periodId).toBe(PERIOD_ID)
  })

  it('registra Otros sin nombre cuando la descripción está vacía', () => {
    const expense = ExpenseService.buildExpense(
      'u',
      {
        periodId: PERIOD_ID,
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
        periodId: PERIOD_ID,
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
        periodId: PERIOD_ID,
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
          periodId: PERIOD_ID,
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

  it('acepta detalle opcional en categorías fijas', () => {
    const expense = ExpenseService.buildExpense(
      'u',
      {
        periodId: PERIOD_ID,
        accountType: AccountType.WHITE,
        category: Category.SUPER,
        description: '  Carniceria  ',
        originalAmount: 50,
        originalCurrency: Currency.USD,
      },
      settings,
    )
    expect(expense.description).toBe('Carniceria')
    expect(expense.category).toBe(Category.SUPER)
  })

  it('deja description null en categoría fija sin detalle', () => {
    const expense = ExpenseService.buildExpense(
      'u',
      {
        periodId: PERIOD_ID,
        accountType: AccountType.WHITE,
        category: Category.DELIVERY,
        originalAmount: 20,
        originalCurrency: Currency.USD,
      },
      settings,
    )
    expect(expense.description).toBeNull()
  })

  it('rechaza detalle demasiado largo en categoría fija', () => {
    expect(() =>
      ExpenseService.buildExpense(
        'u',
        {
          periodId: PERIOD_ID,
          accountType: AccountType.WHITE,
          category: Category.SUPER,
          description: 'x'.repeat(41),
          originalAmount: 10,
          originalCurrency: Currency.USD,
        },
        settings,
      ),
    ).toThrow(/Detalle inválido/)
  })

  it('persiste Devoluciones con montos negativos', () => {
    const expense = ExpenseService.buildExpense(
      'u',
      {
        periodId: PERIOD_ID,
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
        periodId: PERIOD_ID,
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

  it('rechaza moneda deshabilitada', () => {
    const onlyArs = testSettings({ enabledCurrencies: [Currency.ARS] })
    expect(() =>
      ExpenseService.buildExpense(
        'u',
        {
          periodId: PERIOD_ID,
          accountType: AccountType.WHITE,
          category: Category.SUPER,
          originalAmount: 10,
          originalCurrency: Currency.USD,
        },
        onlyArs,
      ),
    ).toThrow(/moneda/i)
  })

  it('en solo pesos registra sin conversión y cotización 1', () => {
    const onlyArs = testSettings({
      enabledCurrencies: [Currency.ARS],
      usdWhite: 1500,
      usdCash: 1400,
    })
    const expense = ExpenseService.buildExpense(
      'u',
      {
        periodId: PERIOD_ID,
        accountType: AccountType.WHITE,
        category: Category.SUPER,
        originalAmount: 2500,
        originalCurrency: Currency.ARS,
      },
      onlyArs,
    )
    expect(expense.exchangeRate).toBe(1)
    expect(expense.usdAmount).toBe(2500)
    expect(expense.originalAmount).toBe(2500)
    expect(expense.originalCurrency).toBe(Currency.ARS)
  })
})
