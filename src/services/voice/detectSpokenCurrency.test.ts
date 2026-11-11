import { describe, expect, it } from 'vitest'
import { Currency } from '@/types/enums'
import { detectSpokenCurrency } from './detectSpokenCurrency'

describe('detectSpokenCurrency', () => {
  it('encuentra dólares al final', () => {
    expect(detectSpokenCurrency('agrega gym 80 000 dolares')).toBe(Currency.USD)
    expect(detectSpokenCurrency('agrega gym 80.000 dólares')).toBe(Currency.USD)
  })

  it('encuentra pesos al final', () => {
    expect(detectSpokenCurrency('agrega auto 80 000 pesos')).toBe(Currency.ARS)
  })

  it('encuentra moneda pegada al número', () => {
    expect(detectSpokenCurrency('agrega gym 20000dolares')).toBe(Currency.USD)
    expect(detectSpokenCurrency('agrega gym 20000pesos')).toBe(Currency.ARS)
  })

  it('el signo $ no es dólares', () => {
    expect(detectSpokenCurrency('agrega gym 80 000 $')).toBeNull()
    expect(detectSpokenCurrency('agrega gym $ 80000 pesos')).toBe(Currency.ARS)
  })
})
