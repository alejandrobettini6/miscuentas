import { describe, expect, it } from 'vitest'
import { AccountType, Category, Currency, PeriodStatus } from '@/types/enums'
import { ImportService } from './ImportService'

const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const periodId = '11111111-1111-4111-8111-111111111111'
const expenseId = '22222222-2222-4222-8222-222222222222'

describe('ImportService', () => {
  it('rechaza JSON inválido', () => {
    const result = ImportService.parseAndValidate('{', userId)
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/JSON/)
  })

  it('acepta JSON v1 y crea un período', () => {
    const raw = JSON.stringify({
      version: 1,
      settings: {
        usdWhite: 1000,
        usdCash: 1200,
        monthlyLimit: 1500,
        customCategories: ['Hobby'],
      },
      expenses: [
        {
          id: expenseId,
          accountType: AccountType.WHITE,
          category: Category.SUPER,
          description: null,
          originalCurrency: Currency.USD,
          originalAmount: 10,
          exchangeRate: 1,
          usdAmount: 10,
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
        },
      ],
    })

    const result = ImportService.parseAndValidate(raw, userId)
    expect(result.ok).toBe(true)
    expect(result.payload?.periods).toHaveLength(1)
    expect(result.payload?.expenses[0]?.periodId).toBe(
      result.payload?.periods[0]?.id,
    )
    expect(result.payload?.settings.customCategories).toContain('Hobby')
  })

  it('acepta JSON v2 y conserva movimientos ocultables', () => {
    const raw = JSON.stringify({
      version: 2,
      settings: {
        usdWhite: 1,
        usdCash: 1,
        monthlyLimit: 1500,
        enabledAccounts: [AccountType.WHITE],
        enabledCurrencies: [Currency.ARS],
        enabledFixedCategories: [Category.SUPER],
        monthMode: 'MANUAL',
        onboardingCompleted: true,
      },
      periods: [
        {
          id: periodId,
          label: 'Julio 2026',
          yearMonth: '2026-07',
          status: PeriodStatus.ACTIVE,
          startedAt: '2026-07-01T00:00:00.000Z',
          closedAt: null,
          monthlyLimitSnapshot: 1500,
        },
      ],
      expenses: [
        {
          id: expenseId,
          periodId,
          accountType: AccountType.CASH,
          category: Category.GYM,
          description: null,
          originalCurrency: Currency.USD,
          originalAmount: 20,
          exchangeRate: 1,
          usdAmount: 20,
          createdAt: '2026-07-02T00:00:00.000Z',
          updatedAt: '2026-07-02T00:00:00.000Z',
        },
      ],
    })

    const result = ImportService.parseAndValidate(raw, userId)
    expect(result.ok).toBe(true)
    expect(result.payload?.expenses).toHaveLength(1)
    expect(result.payload?.settings.enabledAccounts).toEqual([AccountType.WHITE])
  })

  it('rechaza ids duplicados', () => {
    const raw = JSON.stringify({
      version: 1,
      settings: { usdWhite: 1, usdCash: 1, monthlyLimit: 100 },
      expenses: [
        {
          id: expenseId,
          accountType: AccountType.WHITE,
          category: Category.SUPER,
          description: null,
          originalCurrency: Currency.USD,
          originalAmount: 10,
          exchangeRate: 1,
          usdAmount: 10,
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
        },
        {
          id: expenseId,
          accountType: AccountType.WHITE,
          category: Category.SUPER,
          description: null,
          originalCurrency: Currency.USD,
          originalAmount: 5,
          exchangeRate: 1,
          usdAmount: 5,
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
        },
      ],
    })
    const result = ImportService.parseAndValidate(raw, userId)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('duplicado'))).toBe(true)
  })

  it('rechaza periodId inválido en v2', () => {
    const raw = JSON.stringify({
      version: 2,
      settings: { usdWhite: 1, usdCash: 1, monthlyLimit: 100 },
      periods: [
        {
          id: periodId,
          label: 'Julio 2026',
          yearMonth: '2026-07',
          status: PeriodStatus.ACTIVE,
          startedAt: '2026-07-01T00:00:00.000Z',
          closedAt: null,
        },
      ],
      expenses: [
        {
          id: expenseId,
          periodId: '33333333-3333-4333-8333-333333333333',
          accountType: AccountType.WHITE,
          category: Category.SUPER,
          description: null,
          originalCurrency: Currency.USD,
          originalAmount: 10,
          exchangeRate: 1,
          usdAmount: 10,
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
        },
      ],
    })
    const result = ImportService.parseAndValidate(raw, userId)
    expect(result.ok).toBe(false)
  })
})
