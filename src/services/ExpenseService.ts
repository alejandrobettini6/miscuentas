import { AccountType, Category, Currency } from '@/types/enums'
import type { CreateExpenseInput, Expense, Settings, UpdateExpenseInput } from '@/types/models'
import { createId } from '@/utils/id'
import {
  isValidAmount,
  isValidCustomCategoryName,
  normalizeCustomCategoryName,
} from '@/validators/amount'
import { resolveAccountingCurrency } from './AccountingCurrency'
import { CurrencyConverter } from './CurrencyConverter'

export class ExpenseService {
  static buildExpense(
    userId: string,
    input: CreateExpenseInput,
    settings: Settings,
    now = new Date(),
  ): Expense {
    if (!isValidAmount(input.originalAmount)) {
      throw new Error('El importe debe ser mayor a cero')
    }
    if (!input.periodId) {
      throw new Error('Período inválido')
    }
    if (!settings.enabledAccounts.includes(input.accountType)) {
      throw new Error('La cuenta no está habilitada')
    }
    if (!settings.enabledCurrencies.includes(input.originalCurrency)) {
      throw new Error('La moneda no está habilitada')
    }
    if (
      input.category !== Category.OTHER &&
      !settings.enabledFixedCategories.includes(input.category)
    ) {
      throw new Error('La categoría no está habilitada')
    }

    const { exchangeRate, accountingAmount: usdAmountRaw } = this.resolveAmounts(
      input.accountType,
      input.originalCurrency,
      input.originalAmount,
      settings,
    )
    let usdAmount = usdAmountRaw
    let originalAmount = input.originalAmount

    if (input.category === Category.REFUNDS) {
      originalAmount = -Math.abs(originalAmount)
      usdAmount = -Math.abs(usdAmount)
    }

    let description: string | null = input.description ?? null

    if (description && description.trim()) {
      if (!isValidCustomCategoryName(description)) {
        throw new Error(
          input.category === Category.OTHER
            ? 'Nombre de categoría inválido (máx. 40 caracteres)'
            : 'Detalle inválido (máx. 40 caracteres)',
        )
      }
      description = normalizeCustomCategoryName(description)
    } else {
      description = null
    }

    const iso = now.toISOString()

    return {
      id: createId(),
      userId,
      periodId: input.periodId,
      accountType: input.accountType,
      category: input.category,
      description,
      originalCurrency: input.originalCurrency,
      originalAmount,
      exchangeRate,
      // Con base ARS, usdAmount almacena pesos (importe contable).
      usdAmount,
      createdAt: iso,
      updatedAt: iso,
    }
  }

  static updateExpense(
    expense: Expense,
    input: UpdateExpenseInput,
    settings: Settings,
  ): Expense {
    if (!isValidAmount(input.originalAmount)) {
      throw new Error('El importe debe ser mayor a cero')
    }
    if (!settings.enabledCurrencies.includes(input.originalCurrency)) {
      throw new Error('La moneda no está habilitada')
    }

    const { exchangeRate, accountingAmount: usdAmountRaw } = this.resolveAmounts(
      expense.accountType,
      input.originalCurrency,
      input.originalAmount,
      settings,
    )
    let usdAmount = usdAmountRaw
    let originalAmount = input.originalAmount

    if (expense.category === Category.REFUNDS) {
      originalAmount = -Math.abs(originalAmount)
      usdAmount = -Math.abs(usdAmount)
    }

    return {
      ...expense,
      description: expense.description,
      originalCurrency: input.originalCurrency,
      originalAmount,
      exchangeRate,
      usdAmount,
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Resuelve cotización e importe contable.
   * Solo ARS: sin conversión (rate 1, amount = original).
   * Base USD: convierte ARS→USD con la cotización de la cuenta.
   */
  static resolveAmounts(
    accountType: AccountType,
    currency: Currency,
    amount: number,
    settings: Settings,
  ): { exchangeRate: number; accountingAmount: number } {
    const accountingCurrency = resolveAccountingCurrency(settings)

    if (accountingCurrency === Currency.ARS && currency === Currency.ARS) {
      return {
        exchangeRate: 1,
        accountingAmount: CurrencyConverter.roundMoney(amount),
      }
    }

    const exchangeRate = this.resolveRate(accountType, currency, settings)
    return {
      exchangeRate,
      accountingAmount: CurrencyConverter.convertToUsd(amount, currency, exchangeRate),
    }
  }

  static resolveRate(
    accountType: AccountType,
    currency: Currency,
    settings: Settings,
  ): number {
    const accountingCurrency = resolveAccountingCurrency(settings)
    if (accountingCurrency === Currency.ARS && currency === Currency.ARS) {
      return 1
    }
    const accountRate =
      accountType === AccountType.WHITE ? settings.usdWhite : settings.usdCash
    return CurrencyConverter.resolveExchangeRate(currency, accountRate)
  }
}
