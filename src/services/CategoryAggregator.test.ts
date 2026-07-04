import { describe, expect, it } from 'vitest'
import { AccountType, Category, Currency } from '@/types/enums'
import type { Expense } from '@/types/models'
import { CategoryAggregator } from './CategoryAggregator'

function expense(partial: Partial<Expense>): Expense {
  return {
    id: crypto.randomUUID(),
    userId: 'u',
    accountType: AccountType.WHITE,
    category: Category.SUPER,
    description: null,
    originalCurrency: Currency.USD,
    originalAmount: 10,
    exchangeRate: 1,
    usdAmount: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  }
}

describe('CategoryAggregator', () => {
  it('mantiene categorías fijas aunque estén en cero', () => {
    const rows = CategoryAggregator.buildRows([], AccountType.WHITE)
    expect(rows.some((r) => r.label === 'Super' && r.totalUsd === 0)).toBe(true)
    expect(rows.some((r) => r.label === 'Otros' && r.totalUsd === 0)).toBe(true)
  })

  it('acumula Otros Grandes por nombre y ordena por monto', () => {
    const expenses = [
      expense({
        category: Category.OTHER,
        description: 'Guitarra',
        usdAmount: 300,
        createdAt: '2026-01-01T10:00:00.000Z',
      }),
      expense({
        category: Category.OTHER,
        description: 'Guitarra',
        usdAmount: 200,
        createdAt: '2026-01-02T10:00:00.000Z',
      }),
      expense({
        category: Category.OTHER,
        description: 'Ventanal',
        usdAmount: 800,
        createdAt: '2026-01-03T10:00:00.000Z',
      }),
      expense({
        category: Category.OTHER,
        description: null,
        usdAmount: 25,
      }),
    ]

    const rows = CategoryAggregator.buildRows(expenses, AccountType.WHITE)
    const otros = rows.find((r) => r.label === 'Otros' && !r.isOtrosGrande)
    const guitarra = rows.find((r) => r.label === 'Guitarra')
    const ventanal = rows.find((r) => r.label === 'Ventanal')

    expect(otros?.totalUsd).toBe(25)
    expect(guitarra?.totalUsd).toBe(500)
    expect(ventanal?.totalUsd).toBe(800)

    const grandes = rows.filter((r) => r.isOtrosGrande)
    expect(grandes[0]?.label).toBe('Ventanal')
    expect(grandes[1]?.label).toBe('Guitarra')
  })

  it('no mezcla cuentas', () => {
    const expenses = [
      expense({ accountType: AccountType.WHITE, usdAmount: 10 }),
      expense({ accountType: AccountType.CASH, usdAmount: 99 }),
    ]
    const white = CategoryAggregator.buildRows(expenses, AccountType.WHITE)
    const superRow = white.find((r) => r.label === 'Super')
    expect(superRow?.totalUsd).toBe(10)
  })

  it('umbral de Otros Grandes es estricto > 150', () => {
    expect(CategoryAggregator.requiresOtrosGrandeName(150)).toBe(false)
    expect(CategoryAggregator.requiresOtrosGrandeName(150.01)).toBe(true)
  })
})
