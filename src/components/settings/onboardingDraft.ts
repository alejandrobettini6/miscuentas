import {
  AccountType,
  Category,
  Currency,
  MonthMode,
  SummaryDisplayMode,
} from '@/types/enums'
import type { Settings, UpdateSettingsInput } from '@/types/models'
import { normalizeAccountingCurrency } from '@/services/SettingsDefaults'
import { formatAmountFromNumber, parseAmountInput } from '@/validators/amount'

export type OnboardingDraft = {
  enabledCurrencies: Currency[]
  enabledAccounts: AccountType[]
  monthMode: MonthMode
  enabledFixedCategories: Category[]
  customCategories: string[]
  accountingCurrency: Currency
  summaryDisplayMode: SummaryDisplayMode
  monthlyLimit: number | null
  monthlyLimitInput: string
}

export function draftFromSettings(settings: Settings): OnboardingDraft {
  return {
    enabledCurrencies: [...settings.enabledCurrencies],
    enabledAccounts: [...settings.enabledAccounts],
    monthMode: MonthMode.MANUAL,
    enabledFixedCategories: [...settings.enabledFixedCategories],
    customCategories: [...settings.customCategories],
    accountingCurrency: normalizeAccountingCurrency(
      settings.accountingCurrency,
      settings.enabledCurrencies,
    ),
    summaryDisplayMode: settings.summaryDisplayMode,
    monthlyLimit: settings.monthlyLimit,
    monthlyLimitInput:
      settings.monthlyLimit > 0
        ? formatAmountFromNumber(settings.monthlyLimit)
        : '',
  }
}

export function draftToSettingsInput(draft: OnboardingDraft): UpdateSettingsInput {
  const monthlyLimit =
    draft.summaryDisplayMode === SummaryDisplayMode.LIMIT
      ? (draft.monthlyLimit ??
        parseAmountInput(draft.monthlyLimitInput) ??
        undefined)
      : undefined

  return {
    enabledAccounts: draft.enabledAccounts,
    enabledCurrencies: draft.enabledCurrencies,
    enabledFixedCategories: draft.enabledFixedCategories,
    customCategories: draft.customCategories,
    monthMode: draft.monthMode,
    accountingCurrency: normalizeAccountingCurrency(
      draft.accountingCurrency,
      draft.enabledCurrencies,
    ),
    summaryDisplayMode: draft.summaryDisplayMode,
    ...(monthlyLimit !== undefined ? { monthlyLimit } : {}),
    onboardingCompleted: true,
  }
}
