import { describe, expect, it } from 'vitest'
import { AccountType, Currency, MonthMode, SummaryDisplayMode } from '@/types/enums'
import {
  createDefaultSettings,
  mergeSettingsUpdate,
  normalizeEnabledAccounts,
  normalizeAccountingCurrency,
} from './SettingsDefaults'

describe('SettingsDefaults', () => {
  it('crea defaults con onboarding incompleto y mes automático', () => {
    const settings = createDefaultSettings('u')
    expect(settings.onboardingCompleted).toBe(false)
    expect(settings.monthMode).toBe(MonthMode.AUTOMATIC)
    expect(settings.enabledAccounts).toContain(AccountType.WHITE)
    expect(settings.enabledCurrencies).toContain(Currency.USD)
    expect(settings.accountingCurrency).toBe(Currency.USD)
    expect(settings.summaryDisplayMode).toBe(SummaryDisplayMode.LIMIT)
  })

  it('impide dejar cero cuentas', () => {
    const current = createDefaultSettings('u')
    expect(() =>
      mergeSettingsUpdate(current, { enabledAccounts: [] }),
    ).toThrow(/al menos una cuenta/)
  })

  it('normaliza listas vacías a defaults', () => {
    expect(normalizeEnabledAccounts([])).toEqual([
      AccountType.WHITE,
      AccountType.CASH,
    ])
  })

  it('ajusta accountingCurrency a la única moneda habilitada', () => {
    const current = createDefaultSettings('u')
    const next = mergeSettingsUpdate(current, {
      enabledCurrencies: [Currency.ARS],
      accountingCurrency: Currency.USD,
    })
    expect(next.accountingCurrency).toBe(Currency.ARS)
  })

  it('normaliza accountingCurrency inválida a USD si está habilitado', () => {
    expect(
      normalizeAccountingCurrency('EUR', [Currency.ARS, Currency.USD]),
    ).toBe(Currency.USD)
  })

  it('persiste summaryDisplayMode TOTAL', () => {
    const current = createDefaultSettings('u')
    const next = mergeSettingsUpdate(current, {
      summaryDisplayMode: SummaryDisplayMode.TOTAL,
    })
    expect(next.summaryDisplayMode).toBe(SummaryDisplayMode.TOTAL)
  })
})
