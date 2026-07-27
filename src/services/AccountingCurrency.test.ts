import { describe, expect, it } from 'vitest'
import { AccountType, Currency } from '@/types/enums'
import { PERIOD_ID, testExpense, testSettings } from '@/test/fixtures'
import {
  accountingAmount,
  needsExchangeRates,
  resolveAccountingCurrency,
  shouldShowUsdCashRate,
  shouldShowUsdWhiteRate,
} from './AccountingCurrency'

describe('AccountingCurrency', () => {
  it('resuelve ARS solo con pesos habilitados', () => {
    expect(
      resolveAccountingCurrency(
        testSettings({ enabledCurrencies: [Currency.ARS] }),
      ),
    ).toBe(Currency.ARS)
  })

  it('resuelve USD con solo dólares o ambas monedas (default USD)', () => {
    expect(
      resolveAccountingCurrency(
        testSettings({ enabledCurrencies: [Currency.USD] }),
      ),
    ).toBe(Currency.USD)
    expect(
      resolveAccountingCurrency(
        testSettings({
          enabledCurrencies: [Currency.ARS, Currency.USD],
          accountingCurrency: Currency.USD,
        }),
      ),
    ).toBe(Currency.USD)
  })

  it('respeta accountingCurrency cuando hay ambas monedas', () => {
    expect(
      resolveAccountingCurrency(
        testSettings({
          enabledCurrencies: [Currency.ARS, Currency.USD],
          accountingCurrency: Currency.ARS,
        }),
      ),
    ).toBe(Currency.ARS)
  })

  it('usa originalAmount cuando moneda coincide y convierte con rates cuando no', () => {
    const rates = { usdWhite: 1000, usdCash: 1000 }
    const arsExpense = testExpense({
      periodId: PERIOD_ID,
      accountType: AccountType.WHITE,
      originalCurrency: Currency.ARS,
      originalAmount: 10000,
      exchangeRate: 1000,
      usdAmount: 10,
    })
    expect(accountingAmount(arsExpense, Currency.ARS, rates)).toBe(10000)
    expect(accountingAmount(arsExpense, Currency.USD, rates)).toBe(10)

    const usdExpense = testExpense({
      periodId: PERIOD_ID,
      accountType: AccountType.WHITE,
      originalCurrency: Currency.USD,
      originalAmount: 5,
      exchangeRate: 1,
      usdAmount: 5,
    })
    expect(accountingAmount(usdExpense, Currency.USD, rates)).toBe(5)
    expect(accountingAmount(usdExpense, Currency.ARS, rates)).toBe(5000)
  })

  it('muestra cotizaciones solo con ARS+USD y cuenta habilitada', () => {
    const mixed = testSettings({
      enabledCurrencies: [Currency.ARS, Currency.USD],
      enabledAccounts: [AccountType.WHITE],
    })
    expect(needsExchangeRates(mixed)).toBe(true)
    expect(shouldShowUsdWhiteRate(mixed)).toBe(true)
    expect(shouldShowUsdCashRate(mixed)).toBe(false)

    const onlyArs = testSettings({ enabledCurrencies: [Currency.ARS] })
    expect(needsExchangeRates(onlyArs)).toBe(false)
    expect(shouldShowUsdWhiteRate(onlyArs)).toBe(false)
    expect(shouldShowUsdCashRate(onlyArs)).toBe(false)

    const onlyUsd = testSettings({ enabledCurrencies: [Currency.USD] })
    expect(needsExchangeRates(onlyUsd)).toBe(false)
    expect(shouldShowUsdWhiteRate(onlyUsd)).toBe(false)
  })
})
