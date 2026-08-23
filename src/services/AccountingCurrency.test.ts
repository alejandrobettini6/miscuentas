import { describe, expect, it } from 'vitest'
import { AccountType, Currency } from '@/types/enums'
import { PERIOD_ID, testExpense, testSettings } from '@/test/fixtures'
import {
  accountingAmount,
  accountExchangeRate,
  convertMonthlyLimit,
  needsConversionPreview,
  needsExchangeRates,
  needsMonthlyLimitConversion,
  previewAccountingAmount,
  resolveAccountingCurrency,
  resolveAccountingCurrencyAfterEnabledCurrenciesChange,
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

  describe('needsConversionPreview', () => {
    it('oculta preview con una sola moneda habilitada', () => {
      expect(
        needsConversionPreview([Currency.ARS], Currency.ARS, Currency.ARS),
      ).toBe(false)
      expect(
        needsConversionPreview([Currency.USD], Currency.USD, Currency.USD),
      ).toBe(false)
    })

    it('oculta preview cuando la moneda ingresada coincide con la de expresión', () => {
      expect(
        needsConversionPreview(
          [Currency.ARS, Currency.USD],
          Currency.USD,
          Currency.USD,
        ),
      ).toBe(false)
      expect(
        needsConversionPreview(
          [Currency.ARS, Currency.USD],
          Currency.ARS,
          Currency.ARS,
        ),
      ).toBe(false)
    })

    it('muestra preview cuando hay conversión pendiente', () => {
      expect(
        needsConversionPreview(
          [Currency.ARS, Currency.USD],
          Currency.ARS,
          Currency.USD,
        ),
      ).toBe(true)
      expect(
        needsConversionPreview(
          [Currency.ARS, Currency.USD],
          Currency.USD,
          Currency.ARS,
        ),
      ).toBe(true)
    })
  })

  describe('previewAccountingAmount', () => {
    const rates = { usdWhite: 1000, usdCash: 1200 }

    it('convierte ARS a USD con cotización Blanco', () => {
      expect(
        previewAccountingAmount(
          5000,
          Currency.ARS,
          Currency.USD,
          AccountType.WHITE,
          rates,
        ),
      ).toBe(5)
    })

    it('convierte ARS a USD con cotización Negro', () => {
      expect(
        previewAccountingAmount(
          6000,
          Currency.ARS,
          Currency.USD,
          AccountType.CASH,
          rates,
        ),
      ).toBe(5)
    })

    it('convierte USD a ARS con cotización Blanco', () => {
      expect(
        previewAccountingAmount(
          15,
          Currency.USD,
          Currency.ARS,
          AccountType.WHITE,
          rates,
        ),
      ).toBe(15000)
    })

    it('convierte USD a ARS con cotización Negro', () => {
      expect(
        previewAccountingAmount(
          10,
          Currency.USD,
          Currency.ARS,
          AccountType.CASH,
          rates,
        ),
      ).toBe(12000)
    })
  })

  describe('accountExchangeRate', () => {
    it('resuelve cotización según cuenta', () => {
      const rates = { usdWhite: 1000, usdCash: 1200 }
      expect(accountExchangeRate(AccountType.WHITE, rates)).toBe(1000)
      expect(accountExchangeRate(AccountType.CASH, rates)).toBe(1200)
    })
  })

  describe('convertMonthlyLimit', () => {
    it('convierte USD a ARS con cotización dada', () => {
      expect(
        convertMonthlyLimit(1500, Currency.USD, Currency.ARS, 1000),
      ).toBe(1_500_000)
    })

    it('convierte ARS a USD con cotización dada', () => {
      expect(
        convertMonthlyLimit(1_500_000, Currency.ARS, Currency.USD, 1000),
      ).toBe(1500)
    })

    it('no altera el límite si la moneda no cambia', () => {
      expect(
        convertMonthlyLimit(1500, Currency.USD, Currency.USD, 1000),
      ).toBe(1500)
    })
  })

  describe('resolveAccountingCurrencyAfterEnabledCurrenciesChange', () => {
    it('pasa a ARS al deshabilitar USD con límite en dólares', () => {
      const settings = testSettings({
        enabledCurrencies: [Currency.ARS, Currency.USD],
        accountingCurrency: Currency.USD,
      })
      expect(
        resolveAccountingCurrencyAfterEnabledCurrenciesChange(settings, [
          Currency.ARS,
        ]),
      ).toBe(Currency.ARS)
    })

    it('pasa a USD al deshabilitar ARS con límite en pesos', () => {
      const settings = testSettings({
        enabledCurrencies: [Currency.ARS, Currency.USD],
        accountingCurrency: Currency.ARS,
      })
      expect(
        resolveAccountingCurrencyAfterEnabledCurrenciesChange(settings, [
          Currency.USD,
        ]),
      ).toBe(Currency.USD)
    })

    it('mantiene USD si se quita ARS y la contable ya era USD', () => {
      const settings = testSettings({
        enabledCurrencies: [Currency.ARS, Currency.USD],
        accountingCurrency: Currency.USD,
      })
      expect(
        resolveAccountingCurrencyAfterEnabledCurrenciesChange(settings, [
          Currency.USD,
        ]),
      ).toBe(Currency.USD)
    })
  })

  describe('needsMonthlyLimitConversion', () => {
    it('requiere conversión al cambiar moneda contable con límite positivo', () => {
      const settings = testSettings({
        enabledCurrencies: [Currency.ARS, Currency.USD],
        accountingCurrency: Currency.USD,
        monthlyLimit: 1000,
      })
      expect(needsMonthlyLimitConversion(settings, Currency.ARS)).toBe(true)
    })

    it('no requiere conversión si la moneda contable no cambia', () => {
      const settings = testSettings({
        enabledCurrencies: [Currency.ARS, Currency.USD],
        accountingCurrency: Currency.USD,
        monthlyLimit: 1000,
      })
      expect(needsMonthlyLimitConversion(settings, Currency.USD)).toBe(false)
    })

    it('no requiere conversión con límite cero', () => {
      const settings = testSettings({
        enabledCurrencies: [Currency.ARS, Currency.USD],
        accountingCurrency: Currency.USD,
        monthlyLimit: 0,
      })
      expect(needsMonthlyLimitConversion(settings, Currency.ARS)).toBe(false)
    })
  })
})
