import { describe, expect, it } from 'vitest'
import { AccountType, Currency, MonthMode } from '@/types/enums'
import {
  createDefaultSettings,
  mergeSettingsUpdate,
  normalizeEnabledAccounts,
} from './SettingsDefaults'

describe('SettingsDefaults', () => {
  it('crea defaults con onboarding incompleto y mes automático', () => {
    const settings = createDefaultSettings('u')
    expect(settings.onboardingCompleted).toBe(false)
    expect(settings.monthMode).toBe(MonthMode.AUTOMATIC)
    expect(settings.enabledAccounts).toContain(AccountType.WHITE)
    expect(settings.enabledCurrencies).toContain(Currency.USD)
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
})
