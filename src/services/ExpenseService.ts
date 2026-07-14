import { AccountType, Category, type Currency } from '@/types/enums'
import type { CreateExpenseInput, Expense, Settings, UpdateExpenseInput } from '@/types/models'
import { createId } from '@/utils/id'
import {
  isValidAmount,
  isValidCustomCategoryName,
  normalizeCustomCategoryName,
} from '@/validators/amount'
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

    const exchangeRate = this.resolveRate(input.accountType, input.originalCurrency, settings)
    let usdAmount = CurrencyConverter.convertToUsd(
      input.originalAmount,
      input.originalCurrency,
      exchangeRate,
    )
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
      accountType: input.accountType,
      category: input.category,
      description,
      originalCurrency: input.originalCurrency,
      originalAmount,
      exchangeRate,
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

    // La cotización del movimiento se recalcula con la config actual solo al editar el importe.
    // Los movimientos no editados conservan su cotización histórica.
    const exchangeRate = this.resolveRate(
      expense.accountType,
      input.originalCurrency,
      settings,
    )
    let usdAmount = CurrencyConverter.convertToUsd(
      input.originalAmount,
      input.originalCurrency,
      exchangeRate,
    )
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

  static resolveRate(
    accountType: AccountType,
    currency: Currency,
    settings: Settings,
  ): number {
    const accountRate =
      accountType === AccountType.WHITE ? settings.usdWhite : settings.usdCash
    return CurrencyConverter.resolveExchangeRate(currency, accountRate)
  }
}
