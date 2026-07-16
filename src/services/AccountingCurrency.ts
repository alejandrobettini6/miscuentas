import { AccountType, Currency } from '@/types/enums'
import type { Expense, Settings } from '@/types/models'

/**
 * Moneda contable derivada de la configuración del usuario.
 * - Solo ARS → los totales se expresan en pesos, sin conversión.
 * - Solo USD o ambas → base USD (comportamiento histórico).
 */
export function resolveAccountingCurrency(settings: Settings): Currency {
  const onlyArs =
    settings.enabledCurrencies.length === 1 &&
    settings.enabledCurrencies[0] === Currency.ARS
  return onlyArs ? Currency.ARS : Currency.USD
}

export function isArsOnlyMode(settings: Settings): boolean {
  return resolveAccountingCurrency(settings) === Currency.ARS
}

export function isUsdOnlyMode(settings: Settings): boolean {
  return (
    settings.enabledCurrencies.length === 1 &&
    settings.enabledCurrencies[0] === Currency.USD
  )
}

/** Cotizaciones necesarias solo cuando hay ARS y USD a la vez. */
export function needsExchangeRates(settings: Settings): boolean {
  return (
    settings.enabledCurrencies.includes(Currency.ARS) &&
    settings.enabledCurrencies.includes(Currency.USD)
  )
}

export function shouldShowUsdWhiteRate(settings: Settings): boolean {
  return (
    needsExchangeRates(settings) &&
    settings.enabledAccounts.includes(AccountType.WHITE)
  )
}

export function shouldShowUsdCashRate(settings: Settings): boolean {
  return (
    needsExchangeRates(settings) &&
    settings.enabledAccounts.includes(AccountType.CASH)
  )
}

/**
 * Importe a sumar en totales según la moneda contable.
 * Con base ARS y movimiento en ARS usa `originalAmount` (corrige históricos
 * que se guardaron convertidos a USD).
 * El campo persistido `usdAmount` actúa como importe contable genérico.
 */
export function accountingAmount(
  expense: Expense,
  accountingCurrency: Currency,
): number {
  if (
    accountingCurrency === Currency.ARS &&
    expense.originalCurrency === Currency.ARS
  ) {
    return expense.originalAmount
  }
  return expense.usdAmount
}
