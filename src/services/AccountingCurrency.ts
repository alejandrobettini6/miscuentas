import { AccountType, Currency } from '@/types/enums'
import type { Expense, Settings } from '@/types/models'
import { CurrencyConverter } from './CurrencyConverter'

/** Cotizaciones vigentes por tipo de cuenta. */
export interface ExchangeRates {
  usdWhite: number
  usdCash: number
}

/**
 * Moneda contable derivada de la configuración del usuario.
 * - 1 moneda habilitada → esa moneda.
 * - Ambas → settings.accountingCurrency.
 */
export function resolveAccountingCurrency(settings: Settings): Currency {
  if (settings.enabledCurrencies.length === 1) {
    return settings.enabledCurrencies[0]
  }
  if (settings.enabledCurrencies.includes(settings.accountingCurrency)) {
    return settings.accountingCurrency
  }
  return settings.enabledCurrencies.includes(Currency.USD)
    ? Currency.USD
    : (settings.enabledCurrencies[0] ?? Currency.USD)
}

export function isArsOnlyMode(settings: Settings): boolean {
  return (
    settings.enabledCurrencies.length === 1 &&
    settings.enabledCurrencies[0] === Currency.ARS
  )
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

/** Registro con moneda original para conversión contable. */
export interface MonetaryRecord {
  accountType: AccountType
  originalCurrency: Currency
  originalAmount: number
}

/**
 * Importe convertido a la moneda contable solicitada.
 *
 * Siempre parte de `originalCurrency` / `originalAmount` (la moneda y valor
 * que el usuario ingresó) y convierte a `accountingCurrency` usando las
 * cotizaciones actuales de `rates`.  Así, si el usuario cambia la moneda de
 * expresión (ARS ↔ USD), todos los importes se recalculan correctamente.
 */
export function accountingAmountFromRecord(
  record: MonetaryRecord,
  accountingCurrency: Currency,
  rates: ExchangeRates,
): number {
  if (record.originalCurrency === accountingCurrency) {
    return record.originalAmount
  }

  const rate =
    record.accountType === AccountType.WHITE ? rates.usdWhite : rates.usdCash

  if (accountingCurrency === Currency.USD) {
    return CurrencyConverter.roundMoney(record.originalAmount / rate)
  }
  return CurrencyConverter.roundMoney(record.originalAmount * rate)
}

export function accountingAmount(
  expense: Expense,
  accountingCurrency: Currency,
  rates: ExchangeRates,
): number {
  return accountingAmountFromRecord(expense, accountingCurrency, rates)
}
