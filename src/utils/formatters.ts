/**
 * Formato AR-style: miles con punto, decimales con coma solo si existen.
 * Ej: 1250 -> "1.250", 1250.5 -> "1.250,50"
 */
import { Currency } from '@/types/enums'

export function formatUsd(amount: number): string {
  return formatMoney(amount)
}

export function formatMoney(amount: number): string {
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
  return formatMoneyLabel(amount, Currency.USD)
}

/** Etiqueta con moneda contable: "1.500 ARS" o "1.500 USD". */
export function formatMoneyLabel(amount: number, currency: Currency): string {
  if (currency === Currency.ARS) {
    return `$ ${formatMoney(amount)}`
  }
  return `${formatMoney(amount)} USD`
}

export function formatLastMovementDelta(
  amount: number,
  currency: Currency = Currency.USD,
): string {
  const sign = amount >= 0 ? '+' : ''
  if (currency === Currency.ARS) {
    return `(${sign}$ ${formatMoney(amount)})`
  }
  return `(${sign}${formatMoney(amount)})`
}

export function formatPercent(value: number): string {
  const rounded = Math.round(value)
  return `${rounded}%`
}
