export function parseAmountInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed === ',' || trimmed === '.') return null

  const withoutThousands = trimmed.replace(/\./g, '')
  const normalized = withoutThousands.replace(',', '.')
  if (normalized === '' || normalized === '.' || normalized === '-') return null

  const value = Number(normalized)
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100) / 100
}

/** Formatea mientras se tipea: miles con punto, decimales con coma. */
export function formatAmountInput(raw: string): string {
  const commaIndex = raw.indexOf(',')
  const intRaw = commaIndex >= 0 ? raw.slice(0, commaIndex) : raw
  const decRaw = commaIndex >= 0 ? raw.slice(commaIndex + 1) : ''

  const intDigits = intRaw.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  const decDigits = decRaw.replace(/\D/g, '').slice(0, 2)

  const withThousands = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  if (commaIndex >= 0) {
    return decDigits.length > 0 ? `${withThousands},${decDigits}` : `${withThousands},`
  }

  return withThousands
}

/** Formatea un número para mostrar en el input (edición). */
export function formatAmountFromNumber(value: number): string {
  const hasDecimals = Math.round(value * 100) % 100 !== 0
  const fixed = hasDecimals ? value.toFixed(2) : value.toFixed(0)
  const [intPart, decPart] = fixed.split('.')
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decPart ? `${withThousands},${decPart}` : withThousands
}

export function isValidAmount(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

export function isValidExchangeRate(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

export function isValidMonthlyLimit(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

/** Máximo dos palabras para Otros Grandes */
export function isValidOtrosGrandeName(name: string): boolean {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  if (trimmed.length === 0) return false
  const words = trimmed.split(' ')
  return words.length >= 1 && words.length <= 2
}

export function normalizeOtrosGrandeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}
