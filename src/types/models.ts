import type { AccountType, Category, Currency, OfflineOperationStatus, OfflineOperationType } from './enums'

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
  updatedAt: string
}

export interface Expense {
  id: string
  userId: string
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
}
