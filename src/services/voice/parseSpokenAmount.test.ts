import { describe, expect, it } from 'vitest'
import {
  findSpokenAmount,
  parseSpokenAmountTokens,
  tokenizeVoiceText,
} from './parseSpokenAmount'

describe('parseSpokenAmountTokens', () => {
  it('parsea dígitos argentinos', () => {
    expect(parseSpokenAmountTokens(['50.000'])).toBe(50000)
    expect(parseSpokenAmountTokens(['2000'])).toBe(2000)
    expect(parseSpokenAmountTokens(['128,2'])).toBe(128.2)
  })

  it('parsea números en palabras', () => {
    expect(parseSpokenAmountTokens(['cincuenta', 'mil'])).toBe(50000)
    expect(parseSpokenAmountTokens(['dos', 'mil'])).toBe(2000)
    expect(parseSpokenAmountTokens(['cien', 'mil'])).toBe(100000)
    expect(parseSpokenAmountTokens(['mil'])).toBe(1000)
    expect(parseSpokenAmountTokens(['ciento', 'veintiocho', 'coma', 'dos'])).toBe(128.2)
  })
})

describe('findSpokenAmount', () => {
  it('toma el monto al final de la frase', () => {
    const tokens = tokenizeVoiceText('agrega gimnasio en negro cincuenta mil pesos')
    const hit = findSpokenAmount(tokens)
    expect(hit?.value).toBe(50000)
  })

  it('une miles con espacio tipo dictado 80 000', () => {
    const tokens = tokenizeVoiceText('Agrégame 80 000 pesos en auto nafta')
    const hit = findSpokenAmount(tokens)
    expect(hit?.value).toBe(80000)
  })
})
