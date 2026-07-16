import { DEFAULT_SETTINGS } from '@/constants/categories'
import { AccountType, Category, Currency } from '@/types/enums'
import type { Expense, Settings } from '@/types/models'

export const PERIOD_ID = '11111111-1111-4111-8111-111111111111'

export function testSettings(partial: Partial<Settings> = {}): Settings {
  return {
    userId: 'u',
    usdWhite: DEFAULT_SETTINGS.usdWhite,
    usdCash: DEFAULT_SETTINGS.usdCash,
    monthlyLimit: DEFAULT_SETTINGS.monthlyLimit,
    customCategories: [...DEFAULT_SETTINGS.customCategories],
    enabledAccounts: [...DEFAULT_SETTINGS.enabledAccounts],
    enabledCurrencies: [...DEFAULT_SETTINGS.enabledCurrencies],
    enabledFixedCategories: [...DEFAULT_SETTINGS.enabledFixedCategories],
    monthMode: DEFAULT_SETTINGS.monthMode,
    onboardingCompleted: true,
    updatedAt: new Date().toISOString(),
    ...partial,
  }
}

export function testExpense(partial: Partial<Expense> = {}): Expense {
  return {
    id: crypto.randomUUID(),
    userId: 'u',
    periodId: PERIOD_ID,
    accountType: AccountType.WHITE,
    category: Category.SUPER,
    description: null,
    originalCurrency: Currency.USD,
    originalAmount: 10,
    exchangeRate: 1,
    usdAmount: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  }
}
