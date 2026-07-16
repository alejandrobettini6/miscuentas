import type {
  AccountType,
  Category,
  Currency,
  MonthMode,
  OfflineOperationStatus,
  OfflineOperationType,
  PeriodStatus,
} from './enums'

export interface User {
  id: string
  email: string
}

export interface Settings {
  userId: string
  usdWhite: number
  usdCash: number
  monthlyLimit: number
  /** Categorías personalizadas (OTHER + nombre); viven en settings, no en el enum. */
  customCategories: string[]
  enabledAccounts: AccountType[]
  enabledCurrencies: Currency[]
  enabledFixedCategories: Category[]
  monthMode: MonthMode
  onboardingCompleted: boolean
  updatedAt: string
}

export interface Period {
  id: string
  userId: string
  label: string
  yearMonth: string
  status: PeriodStatus
  startedAt: string
  closedAt: string | null
  monthlyLimitSnapshot: number | null
}

export interface Expense {
  id: string
  userId: string
  periodId: string
  accountType: AccountType
  category: Category
  description: string | null
  originalCurrency: Currency
  originalAmount: number
  exchangeRate: number
  usdAmount: number
  createdAt: string
  updatedAt: string
}

export interface OfflineOperation {
  id: string
  type: OfflineOperationType
  payload: unknown
  createdAt: string
  status: OfflineOperationStatus
  attempts: number
  lastError: string | null
}

export interface CategoryRow {
  category: Category
  description: string | null
  label: string
  totalUsd: number
  lastExpense: Expense | null
  isOtrosGrande: boolean
}

export interface MonthlySummary {
  totalWhite: number
  totalCash: number
  totalSpent: number
  available: number
  remainingPercent: number
}

export interface CreateExpenseInput {
  periodId: string
  accountType: AccountType
  category: Category
  description?: string | null
  originalCurrency: Currency
  originalAmount: number
}

export interface UpdateExpenseInput {
  originalCurrency: Currency
  originalAmount: number
}

export interface UpdateSettingsInput {
  usdWhite?: number
  usdCash?: number
  monthlyLimit?: number
  customCategories?: string[]
  enabledAccounts?: AccountType[]
  enabledCurrencies?: Currency[]
  enabledFixedCategories?: Category[]
  monthMode?: MonthMode
  onboardingCompleted?: boolean
}

export interface ImportAccountsPayload {
  version: 1 | 2
  exportedAt?: string
  settings: {
    usdWhite: number
    usdCash: number
    monthlyLimit: number
    customCategories?: string[]
    enabledAccounts?: AccountType[]
    enabledCurrencies?: Currency[]
    enabledFixedCategories?: Category[]
    monthMode?: MonthMode
    onboardingCompleted?: boolean
  }
  categories?: string[]
  periods?: Array<{
    id: string
    label: string
    yearMonth: string
    status: PeriodStatus
    startedAt: string
    closedAt: string | null
    monthlyLimitSnapshot?: number | null
  }>
  expenses: Array<{
    id: string
    periodId?: string
    accountType: AccountType
    category: Category
    description: string | null
    originalCurrency: Currency
    originalAmount: number
    exchangeRate: number
    usdAmount: number
    createdAt: string
    updatedAt: string
  }>
}
