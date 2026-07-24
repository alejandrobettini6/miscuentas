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

  it('convierte a base ARS desde USD', () => {
    expect(
      CurrencyConverter.convertToAccounting(10, Currency.USD, Currency.ARS, 1000),
    ).toBe(10000)
  })

  it('convierte a base USD desde ARS', () => {
    expect(
      CurrencyConverter.convertToAccounting(2000, Currency.ARS, Currency.USD, 1000),
    ).toBe(2)
  })

  it('no convierte cuando moneda = moneda contable', () => {
    expect(
      CurrencyConverter.convertToAccounting(50, Currency.ARS, Currency.ARS, 1000),
    ).toBe(50)
    expect(
      CurrencyConverter.convertToAccounting(50, Currency.USD, Currency.USD, 1000),
    ).toBe(50)
  })
})
