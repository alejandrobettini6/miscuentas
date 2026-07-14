import { describe, expect, it } from 'vitest'
import {
  formatAmountFromNumber,
  formatAmountInput,
  isValidCustomCategoryName,
  normalizeCustomCategoryName,
  parseAmountInput,
} from './amount'

describe('parseAmountInput', () => {
  it('parsea miles con punto', () => {
    expect(parseAmountInput('12.500')).toBe(12500)
    expect(parseAmountInput('100')).toBe(100)
    expect(parseAmountInput('100.000')).toBe(100000)
    expect(parseAmountInput('1.000.500')).toBe(1000500)
  })

  it('parsea decimales con coma', () => {
    expect(parseAmountInput('1.250,50')).toBe(1250.5)
    expect(parseAmountInput('100,25')).toBe(100.25)
  })

  it('rechaza valores inválidos', () => {
    expect(parseAmountInput('')).toBeNull()
    expect(parseAmountInput('0')).toBeNull()
    expect(parseAmountInput('-5')).toBeNull()
  })
})

describe('formatAmountInput', () => {
  it('formatea miles al tipear', () => {
    expect(formatAmountInput('12500')).toBe('12.500')
    expect(formatAmountInput('100')).toBe('100')
    expect(formatAmountInput('100000')).toBe('100.000')
    expect(formatAmountInput('1000500')).toBe('1.000.500')
  })

  it('formatea decimales con coma', () => {
    expect(formatAmountInput('1250,5')).toBe('1.250,5')
    expect(formatAmountInput('1250,50')).toBe('1.250,50')
  })
})

describe('formatAmountFromNumber', () => {
  it('formatea números para edición', () => {
    expect(formatAmountFromNumber(12500)).toBe('12.500')
    expect(formatAmountFromNumber(1250.5)).toBe('1.250,50')
    expect(formatAmountFromNumber(100)).toBe('100')
  })
})

describe('custom category name', () => {
  it('valida y normaliza nombres opcionales', () => {
    expect(isValidCustomCategoryName('')).toBe(false)
    expect(isValidCustomCategoryName('   ')).toBe(false)
    expect(isValidCustomCategoryName('Taxi')).toBe(true)
    expect(isValidCustomCategoryName('Impuesto pais')).toBe(true)
    expect(isValidCustomCategoryName('x'.repeat(41))).toBe(false)
    expect(normalizeCustomCategoryName('  A   B  ')).toBe('A B')
  })
})
