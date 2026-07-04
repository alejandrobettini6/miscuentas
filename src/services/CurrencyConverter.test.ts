import { describe, expect, it } from 'vitest'
import { Currency } from '@/types/enums'
import { CurrencyConverter } from './CurrencyConverter'

describe('CurrencyConverter', () => {
  it('no convierte USD', () => {
    expect(CurrencyConverter.convertToUsd(100, Currency.USD, 1200)).toBe(100)
  })

  it('convierte ARS con cotización de la cuenta', () => {
    expect(CurrencyConverter.convertToUsd(1200, Currency.ARS, 1200)).toBe(1)
    expect(CurrencyConverter.convertToUsd(1500, Currency.ARS, 1000)).toBe(1.5)
  })

  it('redondea a 2 decimales', () => {
    expect(CurrencyConverter.convertToUsd(100, Currency.ARS, 3)).toBe(33.33)
  })
})
