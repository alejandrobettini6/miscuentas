/**
 * Formato AR-style: miles con punto, decimales con coma solo si existen.
 * Ej: 1250 -> "1.250", 1250.5 -> "1.250,50"
 */
export function formatUsd(amount: number): string {
  const negative = amount < 0
  const abs = Math.abs(amount)
  const hasDecimals = Math.round(abs * 100) % 100 !== 0
  const fixed = hasDecimals ? abs.toFixed(2) : abs.toFixed(0)
  const [intPart, decPart] = fixed.split('.')
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const body = decPart ? `${withThousands},${decPart}` : withThousands
  return negative ? `-${body}` : body
}

export function formatUsdLabel(amount: number): string {
  return `${formatUsd(amount)} USD`
}

export function formatLastMovementDelta(usdAmount: number): string {
  const sign = usdAmount >= 0 ? '+' : ''
  return `(${sign}${formatUsd(usdAmount)})`
}

export function formatPercent(value: number): string {
  const rounded = Math.round(value)
  return `${rounded}%`
}
