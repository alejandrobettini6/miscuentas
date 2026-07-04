import { describe, expect, it } from 'vitest'
import { AccountType, Category, Currency } from '@/types/enums'
import type { Expense, Settings } from '@/types/models'
import { ExportService } from './ExportService'

const settings: Settings = {
  userId: 'u',
  usdWhite: 1,
  usdCash: 1,
  monthlyLimit: 1500,
  updatedAt: new Date().toISOString(),
}

const expenses: Expense[] = [
  {
    id: '1',
    userId: 'u',
    accountType: AccountType.WHITE,
    category: Category.SUPER,
    description: null,
    originalCurrency: Currency.USD,
    originalAmount: 10,
    exchangeRate: 1,
    usdAmount: 10,
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z',
  },
]

describe('ExportService', () => {
  it('genera CSV con cuatro columnas', () => {
    const csv = ExportService.toCsv(expenses)
    const lines = csv.split('\n')
    expect(lines[0]).toBe('Categoría Barrani,Monto Barrani,Categoría Blanco,Monto Blanco')
    expect(lines.some((line) => line.includes('Super') && line.includes('10'))).toBe(true)
  })

  it('exporta JSON restaurable sin auth', () => {
    const json = JSON.parse(ExportService.toJson(expenses, settings))
    expect(json.settings.monthlyLimit).toBe(1500)
    expect(json.expenses).toHaveLength(1)
    expect(json.expenses[0].id).toBe('1')
  })
})
