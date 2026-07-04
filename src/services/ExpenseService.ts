import { AccountType, Category, type Currency } from '@/types/enums'
import type { CreateExpenseInput, Expense, Settings, UpdateExpenseInput } from '@/types/models'
import { createId } from '@/utils/id'
import { isValidAmount, isValidOtrosGrandeName, normalizeOtrosGrandeName } from '@/validators/amount'
import { CategoryAggregator } from './CategoryAggregator'
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
    const usdAmount = CurrencyConverter.convertToUsd(
      input.originalAmount,
      input.originalCurrency,
      exchangeRate,
    )

    let description: string | null = input.description ?? null

    if (input.category === Category.OTHER) {
      if (CategoryAggregator.requiresOtrosGrandeName(usdAmount)) {
        if (!description || !isValidOtrosGrandeName(description)) {
          throw new Error('Ingresá un nombre de una o dos palabras')
        }
        description = normalizeOtrosGrandeName(description)
      } else {
        description = null
      }
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
      originalAmount: input.originalAmount,
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
    const usdAmount = CurrencyConverter.convertToUsd(
      input.originalAmount,
      input.originalCurrency,
      exchangeRate,
    )

    let description = expense.description
    if (expense.category === Category.OTHER) {
      if (CategoryAggregator.requiresOtrosGrandeName(usdAmount)) {
        if (!description) {
          throw new Error('Este movimiento requiere un nombre')
        }
      } else {
        description = null
      }
    }

    return {
      ...expense,
      description,
      originalCurrency: input.originalCurrency,
      originalAmount: input.originalAmount,
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
