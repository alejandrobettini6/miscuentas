import { describe, expect, it } from 'vitest'
import { Currency } from '@/types/enums'
import {
  formatLastMovementDelta,
  formatMoneyLabel,
  formatUsd,
} from './formatters'

describe('formatUsd', () => {
  it('formatea miles con punto y decimales con coma', () => {
    expect(formatUsd(25)).toBe('25')
    expect(formatUsd(1250)).toBe('1.250')
    expect(formatUsd(1250.5)).toBe('1.250,50')
  })
})

describe('formatMoneyLabel', () => {
  it('etiqueta ARS con $ y USD con sufijo', () => {
    expect(formatMoneyLabel(1500, Currency.ARS)).toBe('$ 1.500')
    expect(formatMoneyLabel(1500, Currency.USD)).toBe('1.500 USD')
  })

  it('formatea delta del último movimiento según moneda', () => {
    expect(formatLastMovementDelta(25, Currency.ARS)).toBe('(+$ 25)')
    expect(formatLastMovementDelta(-10, Currency.USD)).toBe('(-10)')
  })
})
