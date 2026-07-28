import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { Currency } from '@/types/enums'
import {
  parseSpanishMonthDate,
  parseStatementAmount,
  parseStatementDate,
  yearHintFromYearMonth,
} from './parseAmount'
import {
  detectBestParser,
  parseWithBank,
  shouldAskBankSelection,
} from './registry'
import { CategorySuggestionService } from './CategorySuggestionService'

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__')

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf8')
}

describe('parseStatementAmount', () => {
  it('parses AR thousands and decimals', () => {
    expect(parseStatementAmount('36.000,50')).toBe(36000.5)
    expect(parseStatementAmount('1.250')).toBe(1250)
    expect(parseStatementAmount('15,99')).toBe(15.99)
    expect(parseStatementAmount('$ 15.000,00')).toBe(15000)
  })

  it('rejects invalid amounts', () => {
    expect(parseStatementAmount('')).toBeNull()
    expect(parseStatementAmount('0')).toBeNull()
    expect(parseStatementAmount('-10')).toBeNull()
    expect(parseStatementAmount('-$ 501.180,33')).toBeNull()
  })
})

describe('parseStatementDate', () => {
  it('parses DD/MM/YYYY', () => {
    expect(parseStatementDate('05/03/2026')).toBe('2026-03-05')
  })

  it('parses DD/MM/YY', () => {
    expect(parseStatementDate('05/03/26')).toBe('2026-03-05')
  })

  it('parses Spanish month abbreviations with yearHint', () => {
    expect(parseStatementDate('18/may', 2026)).toBe('2026-05-18')
    expect(parseSpanishMonthDate(3, 'jul', 2026)).toBe('2026-07-03')
    expect(yearHintFromYearMonth('2026-07')).toBe(2026)
  })
})

describe('card statement parsers', () => {
  it('detects Mercado Pago and parses movements', () => {
    const text = loadFixture('mercadopago.txt')
    const detected = detectBestParser(text)
    expect(detected?.parser.id).toBe('mercadopago')
    expect(shouldAskBankSelection(detected)).toBe(false)

    const movements = parseWithBank(text, 'mercadopago', { yearHint: 2026 })
    expect(movements.length).toBe(19)
    expect(
      movements.some((m) => /pago de tarjeta/i.test(m.description)),
    ).toBe(false)
    expect(
      movements.some((m) => /periodo anterior/i.test(m.description)),
    ).toBe(false)

    const panini = movements.find((m) => /PANINIAR/i.test(m.description))
    expect(panini).toMatchObject({
      amount: 15000,
      currency: Currency.ARS,
      date: '2026-05-18',
      installment: '3/3',
    })

    const ng = movements.find((m) => /NGPRODUCTOSSA/i.test(m.description))
    expect(ng?.installment).toBe('2/3')
    expect(ng?.amount).toBe(22095.67)

    const market = movements.find((m) => /PedidosYa Market/i.test(m.description))
    expect(market?.amount).toBe(68380.15)
    expect(market?.date).toBe('2026-07-14')

    const autopista = movements.find((m) =>
      /AUTOPISTA DEL O/i.test(m.description),
    )
    expect(autopista?.amount).toBe(994.15)
    expect(autopista?.description).toMatch(/96000/)
  })

  it('registry only includes Mercado Pago', async () => {
    const { CARD_STATEMENT_PARSERS } = await import('./registry')
    expect(CARD_STATEMENT_PARSERS.map((p) => p.id)).toEqual(['mercadopago'])
  })

  it('returns Mercado Pago with low confidence for unknown text', () => {
    const detected = detectBestParser('random text without bank markers')
    expect(detected?.parser.id).toBe('mercadopago')
    expect(shouldAskBankSelection(detected)).toBe(true)
  })
})

describe('CategorySuggestionService', () => {
  it('returns null in v1 stub', () => {
    expect(CategorySuggestionService.suggest('PEYA MKT')).toBeNull()
  })
})
