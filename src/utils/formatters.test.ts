import { describe, expect, it } from 'vitest'
import { formatUsd } from './formatters'

describe('formatUsd', () => {
  it('formatea miles con punto y decimales con coma', () => {
    expect(formatUsd(25)).toBe('25')
    expect(formatUsd(1250)).toBe('1.250')
    expect(formatUsd(1250.5)).toBe('1.250,50')
  })
})
