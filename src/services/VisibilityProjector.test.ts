import { describe, expect, it } from 'vitest'
import { AccountType, Category, Currency } from '@/types/enums'
import { PERIOD_ID, testExpense, testSettings } from '@/test/fixtures'
import { VisibilityProjector } from './VisibilityProjector'

describe('VisibilityProjector', () => {
  it('filtra por cuenta, moneda y categoría fija', () => {
    const settings = testSettings({
      enabledAccounts: [AccountType.WHITE],
      enabledCurrencies: [Currency.ARS],
      enabledFixedCategories: [Category.SUPER],
    })
    const expenses = [
      testExpense({
        id: 'a',
        accountType: AccountType.WHITE,
        originalCurrency: Currency.ARS,
        category: Category.SUPER,
      }),
      testExpense({
        id: 'b',
        accountType: AccountType.CASH,
        originalCurrency: Currency.ARS,
        category: Category.SUPER,
      }),
      testExpense({
        id: 'c',
        accountType: AccountType.WHITE,
        originalCurrency: Currency.USD,
        category: Category.SUPER,
      }),
      testExpense({
        id: 'd',
        accountType: AccountType.WHITE,
        originalCurrency: Currency.ARS,
        category: Category.GYM,
      }),
      testExpense({
        id: 'e',
        accountType: AccountType.WHITE,
        originalCurrency: Currency.ARS,
        category: Category.OTHER,
        description: 'Hobby',
      }),
    ]

    const visible = VisibilityProjector.project(expenses, settings)
    expect(visible.map((e) => e.id).sort()).toEqual(['a', 'e'])
  })

  it('vuelve a mostrar al reactivar opciones', () => {
    const settingsHidden = testSettings({
      enabledAccounts: [AccountType.WHITE],
      enabledCurrencies: [Currency.USD],
    })
    const expense = testExpense({
      accountType: AccountType.CASH,
      originalCurrency: Currency.ARS,
    })
    expect(VisibilityProjector.project([expense], settingsHidden)).toHaveLength(0)

    const settingsAll = testSettings()
    expect(VisibilityProjector.project([expense], settingsAll)).toHaveLength(1)
  })

  it('filtra por período', () => {
    const expenses = [
      testExpense({ id: '1', periodId: PERIOD_ID }),
      testExpense({
        id: '2',
        periodId: '22222222-2222-4222-8222-222222222222',
      }),
    ]
    expect(VisibilityProjector.forPeriod(expenses, PERIOD_ID)).toHaveLength(1)
  })
})
