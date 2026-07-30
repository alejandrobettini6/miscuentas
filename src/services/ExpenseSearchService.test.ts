import { describe, expect, it } from 'vitest'
import { FIXED_CATEGORIES } from '@/constants/categories'
import { AccountType, Category, Currency } from '@/types/enums'
import type { Expense } from '@/types/models'
import { CategoryAggregator } from './CategoryAggregator'
import { ExpenseSearchService, normalizeSearchText } from './ExpenseSearchService'

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

function search(
  query: string,
  expenses: Expense[],
  accountType = AccountType.WHITE,
) {
  const rows = CategoryAggregator.buildRows(
    expenses,
    accountType,
    ['Guitarra'],
    FIXED_CATEGORIES,
  )
  return ExpenseSearchService.search({
    query,
    rows,
    expenses,
    accountType,
    customCategories: ['Guitarra'],
  })
}

describe('normalizeSearchText', () => {
  it('quita acentos y pasa a minúsculas', () => {
    expect(normalizeSearchText('  Devolución ')).toBe('devolucion')
  })
})

describe('ExpenseSearchService', () => {
  it('query vacía devuelve lista vacía', () => {
    expect(search('', [])).toEqual([])
  })

  it('prioriza categoría sobre movimientos', () => {
    const expenses = [
      expense({
        category: Category.OTHER,
        description: 'Supermercado Carrefour',
        originalAmount: 50,
        usdAmount: 50,
      }),
    ]
    const results = search('super', expenses)
    expect(results).toHaveLength(1)
    expect(results[0]?.kind).toBe('category')
    if (results[0]?.kind === 'category') {
      expect(results[0].row.label).toBe('Super')
    }
  })

  it('busca movimientos por descripción si no hay categoría', () => {
    const expenses = [
      expense({
        category: Category.OTHER,
        description: 'Carrefour',
        originalAmount: 50,
        usdAmount: 50,
        createdAt: '2026-01-02T10:00:00.000Z',
      }),
    ]
    const results = search('carrefour', expenses)
    expect(results).toHaveLength(1)
    expect(results[0]?.kind).toBe('expense')
    if (results[0]?.kind === 'expense') {
      expect(results[0].row.label).toBe('Otros')
      expect(results[0].detail).toBe('Carrefour')
      expect(results[0].amount).toBe(50)
    }
  })

  it('encuentra categoría sin acentos', () => {
    const expenses = [
      expense({
        category: Category.REFUNDS,
        originalAmount: 20,
        usdAmount: 20,
      }),
    ]
    const results = search('devolucion', expenses)
    expect(results).toHaveLength(1)
    expect(results[0]?.kind).toBe('category')
    if (results[0]?.kind === 'category') {
      expect(results[0].row.label).toBe('Devoluciones')
    }
  })

  it('no incluye gastos de otra cuenta', () => {
    const expenses = [
      expense({
        accountType: AccountType.CASH,
        category: Category.OTHER,
        description: 'Carrefour',
        originalAmount: 50,
        usdAmount: 50,
      }),
    ]
    const results = search('carrefour', expenses, AccountType.WHITE)
    expect(results).toHaveLength(0)
  })
})
