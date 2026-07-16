import { AccountType, Category, Currency, MonthMode } from '@/types/enums'

export const FIXED_CATEGORIES: Category[] = [
  Category.SUPER,
  Category.DELIVERY,
  Category.AUTO,
  Category.SALUD,
  Category.SERVICIOS,
  Category.NINA,
  Category.SALIDAS,
  Category.PELO,
  Category.GYM,
  Category.LIMPIEZA,
  Category.TAXES,
  Category.REFUNDS,
]

export const CATEGORY_LABELS: Record<Category, string> = {
  [Category.SUPER]: 'Super',
  [Category.DELIVERY]: 'Delivery',
  [Category.AUTO]: 'Auto',
  [Category.SALUD]: 'Salud',
  [Category.SERVICIOS]: 'Servicios',
  [Category.NINA]: 'Nina',
  [Category.SALIDAS]: 'Salidas',
  [Category.PELO]: 'Pelo',
  [Category.GYM]: 'Gym',
  [Category.LIMPIEZA]: 'Limpieza',
  [Category.TAXES]: 'Impuestos',
  [Category.REFUNDS]: 'Devoluciones',
  [Category.OTHER]: 'Otros',
}

export const ACCOUNT_LABELS: Record<AccountType, string> = {
  [AccountType.WHITE]: 'Blanco',
  [AccountType.CASH]: 'Negro',
}

export const CURRENCY_LABELS: Record<Currency, string> = {
  [Currency.USD]: 'Dólares',
  [Currency.ARS]: 'Pesos',
}

export const UNDO_WINDOW_MS = 15_000

export const DEFAULT_SETTINGS = {
  usdWhite: 1,
  usdCash: 1,
  monthlyLimit: 1500,
  customCategories: [] as string[],
  enabledAccounts: [AccountType.WHITE, AccountType.CASH] as AccountType[],
  enabledCurrencies: [Currency.USD, Currency.ARS] as Currency[],
  enabledFixedCategories: [...FIXED_CATEGORIES] as Category[],
  monthMode: MonthMode.AUTOMATIC,
  onboardingCompleted: false,
} as const
