import { DEFAULT_SETTINGS, FIXED_CATEGORIES } from '@/constants/categories'
import {
  AccountType,
  Category,
  Currency,
  MonthMode,
  SummaryDisplayMode,
} from '@/types/enums'
import type { Settings, UpdateSettingsInput } from '@/types/models'

const ACCOUNT_VALUES = new Set<string>(Object.values(AccountType))
const CURRENCY_VALUES = new Set<string>(Object.values(Currency))
const FIXED_SET = new Set<Category>(FIXED_CATEGORIES)
const MONTH_MODE_VALUES = new Set<string>(Object.values(MonthMode))
const SUMMARY_MODE_VALUES = new Set<string>(Object.values(SummaryDisplayMode))

export function normalizeEnabledAccounts(raw: unknown): AccountType[] {
  const list = Array.isArray(raw)
    ? raw.filter((item): item is AccountType => ACCOUNT_VALUES.has(String(item)))
    : [...DEFAULT_SETTINGS.enabledAccounts]
  const unique = uniqueEnum(list)
  return unique.length > 0 ? unique : [...DEFAULT_SETTINGS.enabledAccounts]
}

export function normalizeEnabledCurrencies(raw: unknown): Currency[] {
  const list = Array.isArray(raw)
    ? raw.filter((item): item is Currency => CURRENCY_VALUES.has(String(item)))
    : [...DEFAULT_SETTINGS.enabledCurrencies]
  const unique = uniqueEnum(list)
  return unique.length > 0 ? unique : [...DEFAULT_SETTINGS.enabledCurrencies]
}

export function normalizeEnabledFixedCategories(raw: unknown): Category[] {
  const list = Array.isArray(raw)
    ? raw.filter(
        (item): item is Category =>
          FIXED_SET.has(item as Category) && item !== Category.OTHER,
      )
    : [...DEFAULT_SETTINGS.enabledFixedCategories]
  return uniqueEnum(list)
}

export function normalizeMonthMode(raw: unknown): MonthMode {
  if (typeof raw === 'string' && MONTH_MODE_VALUES.has(raw)) {
    return raw as MonthMode
  }
  return MonthMode.AUTOMATIC
}

export function normalizeSummaryDisplayMode(raw: unknown): SummaryDisplayMode {
  if (typeof raw === 'string' && SUMMARY_MODE_VALUES.has(raw)) {
    return raw as SummaryDisplayMode
  }
  return SummaryDisplayMode.LIMIT
}

export function normalizeAccountingCurrency(
  raw: unknown,
  enabledCurrencies?: Currency[],
): Currency {
  const currencies =
    enabledCurrencies && enabledCurrencies.length > 0
      ? enabledCurrencies
      : [...DEFAULT_SETTINGS.enabledCurrencies]

  if (currencies.length === 1) {
    return currencies[0]
  }

  if (typeof raw === 'string' && CURRENCY_VALUES.has(raw)) {
    const currency = raw as Currency
    if (currencies.includes(currency)) return currency
  }

  if (currencies.includes(Currency.USD)) return Currency.USD
  return currencies[0] ?? Currency.USD
}

export function createDefaultSettings(userId: string, now = new Date()): Settings {
  return {
    userId,
    usdWhite: DEFAULT_SETTINGS.usdWhite,
    usdCash: DEFAULT_SETTINGS.usdCash,
    monthlyLimit: DEFAULT_SETTINGS.monthlyLimit,
    customCategories: [...DEFAULT_SETTINGS.customCategories],
    incomeSources: [...DEFAULT_SETTINGS.incomeSources],
    enabledAccounts: [...DEFAULT_SETTINGS.enabledAccounts],
    enabledCurrencies: [...DEFAULT_SETTINGS.enabledCurrencies],
    enabledFixedCategories: [...DEFAULT_SETTINGS.enabledFixedCategories],
    monthMode: DEFAULT_SETTINGS.monthMode,
    accountingCurrency: DEFAULT_SETTINGS.accountingCurrency,
    summaryDisplayMode: DEFAULT_SETTINGS.summaryDisplayMode,
    onboardingCompleted: DEFAULT_SETTINGS.onboardingCompleted,
    updatedAt: now.toISOString(),
  }
}

/** Compatibilidad con settings antiguas / filas incompletas. */
export function normalizeSettings(
  raw: Partial<Settings> & { userId?: string },
  userId: string,
): Settings {
  const enabledCurrencies = normalizeEnabledCurrencies(raw.enabledCurrencies)
  return {
    userId: raw.userId ?? userId,
    usdWhite: Number(raw.usdWhite ?? DEFAULT_SETTINGS.usdWhite),
    usdCash: Number(raw.usdCash ?? DEFAULT_SETTINGS.usdCash),
    monthlyLimit: Number(raw.monthlyLimit ?? DEFAULT_SETTINGS.monthlyLimit),
    customCategories: Array.isArray(raw.customCategories) ? raw.customCategories : [],
    incomeSources: Array.isArray(raw.incomeSources) ? raw.incomeSources : [],
    enabledAccounts: normalizeEnabledAccounts(raw.enabledAccounts),
    enabledCurrencies,
    enabledFixedCategories: normalizeEnabledFixedCategories(raw.enabledFixedCategories),
    monthMode: normalizeMonthMode(raw.monthMode),
    accountingCurrency: normalizeAccountingCurrency(
      raw.accountingCurrency,
      enabledCurrencies,
    ),
    summaryDisplayMode: normalizeSummaryDisplayMode(raw.summaryDisplayMode),
    onboardingCompleted: Boolean(raw.onboardingCompleted),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  }
}

export function mergeSettingsUpdate(
  current: Settings,
  input: UpdateSettingsInput,
): Settings {
  let enabledAccounts = current.enabledAccounts
  if (input.enabledAccounts !== undefined) {
    const filtered = uniqueEnum(
      input.enabledAccounts.filter((item) => ACCOUNT_VALUES.has(String(item))),
    )
    if (filtered.length === 0) {
      throw new Error('Debés habilitar al menos una cuenta')
    }
    enabledAccounts = filtered
  }

  let enabledCurrencies = current.enabledCurrencies
  if (input.enabledCurrencies !== undefined) {
    const filtered = uniqueEnum(
      input.enabledCurrencies.filter((item) => CURRENCY_VALUES.has(String(item))),
    )
    if (filtered.length === 0) {
      throw new Error('Debés habilitar al menos una moneda')
    }
    enabledCurrencies = filtered
  }

  const accountingCurrency = normalizeAccountingCurrency(
    input.accountingCurrency ?? current.accountingCurrency,
    enabledCurrencies,
  )

  return {
    ...current,
    usdWhite: input.usdWhite ?? current.usdWhite,
    usdCash: input.usdCash ?? current.usdCash,
    monthlyLimit: input.monthlyLimit ?? current.monthlyLimit,
    customCategories: input.customCategories ?? current.customCategories,
    incomeSources: input.incomeSources ?? current.incomeSources,
    enabledAccounts,
    enabledCurrencies,
    enabledFixedCategories:
      input.enabledFixedCategories !== undefined
        ? normalizeEnabledFixedCategories(input.enabledFixedCategories)
        : current.enabledFixedCategories,
    monthMode:
      input.monthMode !== undefined
        ? normalizeMonthMode(input.monthMode)
        : current.monthMode,
    accountingCurrency,
    summaryDisplayMode:
      input.summaryDisplayMode !== undefined
        ? normalizeSummaryDisplayMode(input.summaryDisplayMode)
        : current.summaryDisplayMode,
    onboardingCompleted:
      input.onboardingCompleted !== undefined
        ? Boolean(input.onboardingCompleted)
        : current.onboardingCompleted,
    updatedAt: new Date().toISOString(),
  }
}

function uniqueEnum<T extends string>(values: T[]): T[] {
  return [...new Set(values)]
}
