import { Currency } from '@/types/enums'

/**
 * Único punto de conversión de monedas.
 * Para agregar EUR u otras monedas: extender Currency y la lógica de convert.
 */
export class CurrencyConverter {
  static convertToUsd(
    amount: number,
    currency: Currency,
    exchangeRate: number,
  ): number {
    if (currency === Currency.USD) {
      return this.roundMoney(amount)
    }

    if (currency === Currency.ARS) {
      if (exchangeRate <= 0) {
        throw new Error('La cotización debe ser mayor a cero')
      }
      return this.roundMoney(amount / exchangeRate)
    }

    throw new Error(`Moneda no soportada: ${currency}`)
  }

  /** Convierte un importe a la moneda contable (USD o ARS). */
  static convertToAccounting(
    amount: number,
    currency: Currency,
    accountingCurrency: Currency,
    exchangeRate: number,
  ): number {
    if (currency === accountingCurrency) {
      return this.roundMoney(amount)
    }

    if (exchangeRate <= 0) {
      throw new Error('La cotización debe ser mayor a cero')
    }

    if (accountingCurrency === Currency.USD) {
      return this.convertToUsd(amount, currency, exchangeRate)
    }

    // Base ARS: USD → ARS (multiplicar por cotización)
    if (currency === Currency.USD) {
      return this.roundMoney(amount * exchangeRate)
    }

    return this.roundMoney(amount)
  }

  static resolveExchangeRate(
    currency: Currency,
    accountRate: number,
  ): number {
    if (currency === Currency.USD) return 1
    return accountRate
  }

  /**
   * Cotización ARS/USD de la cuenta, usada para convertir hacia la moneda contable.
   * Siempre es el rate de la cuenta cuando hace falta conversión (ambas monedas).
   */
  static resolveAccountRate(accountRate: number): number {
    return accountRate
  }

  static roundMoney(value: number): number {
    return Math.round(value * 100) / 100
  }
}
