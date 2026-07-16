import { describe, expect, it } from 'vitest'
import { FIXED_CATEGORIES } from '@/constants/categories'
import { AccountType, Category, Currency } from '@/types/enums'
import type { Expense } from '@/types/models'
import { CategoryAggregator } from './CategoryAggregator'

function expense(partial: Partial<Expense>): Expense {
  return {
    id: crypto.randomUUID(),
    userId: 'u',
    periodId: '11111111-1111-4111-8111-111111111111',
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
    expect(rows.some((r) => r.label === 'Impuestos' && r.totalUsd === 0)).toBe(true)
    expect(rows.some((r) => r.label === 'Devoluciones' && r.totalUsd === 0)).toBe(true)
    expect(rows.some((r) => r.label === 'Otros' && r.totalUsd === 0)).toBe(true)
  })

  it('oculta categorías fijas deshabilitadas', () => {
    const rows = CategoryAggregator.buildRows([], AccountType.WHITE, [], [
      Category.SUPER,
      Category.DELIVERY,
    ])
    expect(rows.some((r) => r.label === 'Super')).toBe(true)
    expect(rows.some((r) => r.label === 'Gym')).toBe(false)
    expect(rows.some((r) => r.label === 'Otros')).toBe(true)
  })

  it('en modo ARS suma originalAmount de gastos en pesos', () => {
    const expenses = [
      expense({
        category: Category.SUPER,
        originalCurrency: Currency.ARS,
        originalAmount: 5000,
        exchangeRate: 1000,
        usdAmount: 5,
      }),
    ]
    const rows = CategoryAggregator.buildRows(
      expenses,
      AccountType.WHITE,
      [],
      FIXED_CATEGORIES,
      Currency.ARS,
    )
    const superRow = rows.find((r) => r.label === 'Super')
    expect(superRow?.totalUsd).toBe(5000)
  })

  it('acumula categorías personalizadas por nombre y ordena por monto', () => {
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

  it('agrupa nombres personalizados sin importar mayúsculas', () => {
    const expenses = [
      expense({
        category: Category.OTHER,
        description: 'Taxi',
        usdAmount: 10,
      }),
      expense({
        category: Category.OTHER,
        description: 'taxi',
        usdAmount: 5,
      }),
    ]
    const rows = CategoryAggregator.buildRows(expenses, AccountType.WHITE)
    const named = rows.filter((r) => r.isOtrosGrande)
    expect(named).toHaveLength(1)
    expect(named[0]?.totalUsd).toBe(15)
  })

  it('suma Devoluciones como monto negativo', () => {
    const expenses = [
      expense({
        category: Category.REFUNDS,
        originalAmount: -50,
        usdAmount: -50,
      }),
    ]
    const rows = CategoryAggregator.buildRows(expenses, AccountType.WHITE)
    const refunds = rows.find((r) => r.label === 'Devoluciones')
    expect(refunds?.totalUsd).toBe(-50)
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

  it('muestra categorías personalizadas de settings aunque estén en cero', () => {
    const rows = CategoryAggregator.buildRows([], AccountType.WHITE, ['Mascotas'])
    const mascotas = rows.find((r) => r.label === 'Mascotas' && r.isOtrosGrande)
    expect(mascotas?.totalUsd).toBe(0)
    expect(mascotas?.lastExpense).toBeNull()
  })

  it('une gastos con categorías de settings sin duplicar y etiqueta Negro en totales', () => {
    const expenses = [
      expense({
        category: Category.OTHER,
        description: 'Mascotas',
        usdAmount: 40,
      }),
    ]
    const rows = CategoryAggregator.buildRows(expenses, AccountType.WHITE, [
      'Mascotas',
      'Hobby',
    ])
    const named = rows.filter((r) => r.isOtrosGrande)
    expect(named).toHaveLength(2)
    expect(named.find((r) => r.label === 'Mascotas')?.totalUsd).toBe(40)
    expect(named.find((r) => r.label === 'Hobby')?.totalUsd).toBe(0)
  })
})
