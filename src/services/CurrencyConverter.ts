import { Currency } from '@/types/enums'

/**
 * Único punto de conversión de monedas.
 * Para agregar EUR u otras monedas: extender Currency y la lógica de convertToUsd.
 */
export class CurrencyConverter {
  static convertToUsd(
    amount: number,
    currency: Currency,
    exchangeRate: number,
  ): number {
    if (currency === Currency.USD) {
      return roundUsd(amount)
    }

    if (currency === Currency.ARS) {
      if (exchangeRate <= 0) {
        throw new Error('La cotización debe ser mayor a cero')
      }
      return roundUsd(amount / exchangeRate)
    }

    // Futuras monedas (EUR, GBP, etc.): agregar rama aquí.
    throw new Error(`Moneda no soportada: ${currency}`)
  }

  static resolveExchangeRate(
    currency: Currency,
    accountRate: number,
  ): number {
    if (currency === Currency.USD) return 1
    return accountRate
  }
}

function roundUsd(value: number): number {
  return Math.round(value * 100) / 100
}
