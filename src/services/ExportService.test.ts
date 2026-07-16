import { describe, expect, it } from 'vitest'
import { AccountType, Category, Currency } from '@/types/enums'
import type { Expense } from '@/types/models'
import { PERIOD_ID, testSettings } from '@/test/fixtures'
import { ExportService } from './ExportService'

const settings = testSettings({ usdWhite: 1554, usdCash: 1515 })

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

const whiteArs: Expense = {
  id: '1',
  userId: 'u',
  periodId: PERIOD_ID,
  accountType: AccountType.WHITE,
  category: Category.SUPER,
  description: null,
  originalCurrency: Currency.ARS,
  originalAmount: 24500,
  exchangeRate: 1554,
  usdAmount: 15.77,
  createdAt: '2026-07-04T18:44:04.084Z',
  updatedAt: '2026-07-04T18:44:04.084Z',
}

const cashUsd: Expense = {
  id: '2',
  userId: 'u',
  periodId: PERIOD_ID,
  accountType: AccountType.CASH,
  category: Category.SALIDAS,
  description: null,
  originalCurrency: Currency.USD,
  originalAmount: 10.2,
  exchangeRate: 1,
  usdAmount: 10.2,
  createdAt: '2026-07-04T18:44:51.58Z',
  updatedAt: '2026-07-04T18:44:51.58Z',
}

describe('ExportService', () => {
  it('genera CSV con cuatro columnas y etiqueta Negro', () => {
    const csv = ExportService.toCsv([whiteArs])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('Categoría Negro,Monto Negro,Categoría Blanco,Monto Blanco')
    expect(lines.some((line) => line.includes('Super') && line.includes('15,77'))).toBe(true)
  })

  it('mantiene montos decimales en una sola columna y categorías como labels', () => {
    const csv = ExportService.toCsv([whiteArs, cashUsd])
    const dataRows = csv.split('\n').slice(1)

    for (const row of dataRows) {
      const cols = parseCsvLine(row)
      expect(cols).toHaveLength(4)
      if (cols[0]) expect(Number.isNaN(Number(cols[0].replace(',', '.')))).toBe(true)
      if (cols[2]) expect(Number.isNaN(Number(cols[2].replace(',', '.')))).toBe(true)
    }

    const superRow = dataRows.find((r) => parseCsvLine(r)[2] === 'Super')
    expect(superRow).toBeDefined()
    const superCols = parseCsvLine(superRow!)
    expect(superCols[3]).toBe('15,77')

    const salidasRow = dataRows.find((r) => parseCsvLine(r)[0] === 'Salidas')
    expect(salidasRow).toBeDefined()
    const salidasCols = parseCsvLine(salidasRow!)
    expect(salidasCols[1]).toBe('10,20')
  })

  it('en logs USD deja cotización vacía y no parte decimales', () => {
    const logs = ExportService.toLogs([cashUsd])
    const cols = parseCsvLine(logs.split('\n')[1]!)
    expect(cols).toHaveLength(11)
    expect(cols[6]).toBe('USD')
    expect(cols[7]).toBe('10,20')
    expect(cols[8]).toBe('')
    expect(cols[9]).toBe('10,20')
    expect(cols[10]).toBe(PERIOD_ID)
  })

  it('en logs ARS exporta cotización y columnas sin corrimiento', () => {
    const logs = ExportService.toLogs([whiteArs])
    const cols = parseCsvLine(logs.split('\n')[1]!)
    expect(cols).toHaveLength(11)
    expect(cols[4]).toBe('Super')
    expect(cols[6]).toBe('ARS')
    expect(cols[7]).toBe('24.500')
    expect(cols[8]).toBe('1.554')
    expect(cols[9]).toBe('15,77')
  })

  it('exporta JSON v2 restaurable sin auth', () => {
    const json = JSON.parse(ExportService.toJson([whiteArs], settings))
    expect(json.version).toBe(2)
    expect(json.settings.monthlyLimit).toBe(1500)
    expect(json.settings.enabledAccounts).toContain('WHITE')
    expect(json.expenses).toHaveLength(1)
    expect(json.expenses[0].id).toBe('1')
    expect(json.expenses[0].periodId).toBe(PERIOD_ID)
  })
})
