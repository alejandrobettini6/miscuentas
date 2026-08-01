import { describe, expect, it } from 'vitest'
import { AccountType, Currency } from '@/types/enums'
import { IncomeService, normalizeIncomeDescription } from './IncomeService'
import { PERIOD_ID, testSettings } from '@/test/fixtures'

describe('IncomeService', () => {
  it('crea ingreso con descripción normalizada', () => {
    const settings = testSettings()
    const income = IncomeService.buildIncome('u', {
      periodId: PERIOD_ID,
      accountType: AccountType.WHITE,
      description: '  trabajo ',
      originalCurrency: Currency.USD,
      originalAmount: 1000,
    }, settings)

    expect(income.description).toBe('trabajo')
    expect(income.originalAmount).toBe(1000)
  })

  it('permite detalle vacío', () => {
    const settings = testSettings()
    const income = IncomeService.buildIncome('u', {
      periodId: PERIOD_ID,
      accountType: AccountType.WHITE,
      description: '',
      originalCurrency: Currency.USD,
      originalAmount: 100,
    }, settings)

    expect(income.description).toBe('')
  })

  it('rechaza detalle demasiado largo', () => {
    expect(() => normalizeIncomeDescription('a'.repeat(41))).toThrow(/Detalle inválido/)
  })
})
