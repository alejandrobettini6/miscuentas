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

  it('resuelve USD con solo dólares o ambas monedas', () => {
    expect(
      resolveAccountingCurrency(
        testSettings({ enabledCurrencies: [Currency.USD] }),
      ),
    ).toBe(Currency.USD)
    expect(
      resolveAccountingCurrency(
        testSettings({ enabledCurrencies: [Currency.ARS, Currency.USD] }),
      ),
    ).toBe(Currency.USD)
  })

  it('usa originalAmount para ARS históricos en modo solo pesos', () => {
    const expense = testExpense({
      periodId: PERIOD_ID,
      originalCurrency: Currency.ARS,
      originalAmount: 10000,
      exchangeRate: 1000,
      usdAmount: 10,
    })
    expect(accountingAmount(expense, Currency.ARS)).toBe(10000)
    expect(accountingAmount(expense, Currency.USD)).toBe(10)
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
