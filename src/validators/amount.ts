export function parseAmountInput(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (normalized === '' || normalized === '.' || normalized === '-') return null
  const value = Number(normalized)
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100) / 100
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
