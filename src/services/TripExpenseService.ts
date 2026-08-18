import { AccountType, Currency } from '@/types/enums'
import type {
  CreateTripExpenseInput,
  Settings,
  Trip,
  TripExpense,
  UpdateTripExpenseInput,
} from '@/types/models'
import { createId } from '@/utils/id'
import { isValidAmount } from '@/validators/amount'
import { resolveAccountingCurrency } from './AccountingCurrency'
import { CurrencyConverter } from './CurrencyConverter'

export class TripExpenseService {
  static buildExpense(
    userId: string,
    input: CreateTripExpenseInput,
    trip: Trip,
    settings: Settings,
    now = new Date(),
  ): TripExpense {
    if (!isValidAmount(input.originalAmount)) {
      throw new Error('El importe debe ser mayor a cero')
    }
    if (!input.tripId) {
      throw new Error('Viaje inválido')
    }
    if (!trip.enabledAccounts.includes(input.accountType)) {
      throw new Error('La cuenta no está habilitada en este viaje')
    }
    if (!trip.enabledCurrencies.includes(input.originalCurrency)) {
      throw new Error('La moneda no está habilitada en este viaje')
    }

    const { exchangeRate, accountingAmount: usdAmount } = this.resolveAmounts(
      input.accountType,
      input.originalCurrency,
      input.originalAmount,
      trip,
      settings,
    )

    let description: string | null = input.description?.trim() ?? null
    if (description && description.length > 40) {
      throw new Error('Detalle inválido (máx. 40 caracteres)')
    }
    if (description === '') description = null

    const iso = now.toISOString()

    return {
      id: createId(),
      userId,
      tripId: input.tripId,
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
    expense: TripExpense,
    input: UpdateTripExpenseInput,
    trip: Trip,
    settings: Settings,
  ): TripExpense {
    if (!isValidAmount(input.originalAmount)) {
      throw new Error('El importe debe ser mayor a cero')
    }
    if (!trip.enabledCurrencies.includes(input.originalCurrency)) {
      throw new Error('La moneda no está habilitada en este viaje')
    }

    const { exchangeRate, accountingAmount: usdAmount } = this.resolveAmounts(
      expense.accountType,
      input.originalCurrency,
      input.originalAmount,
      trip,
      settings,
    )

    return {
      ...expense,
      originalCurrency: input.originalCurrency,
      originalAmount: input.originalAmount,
      exchangeRate,
      usdAmount,
      updatedAt: new Date().toISOString(),
    }
  }

  static resolveAmounts(
    accountType: AccountType,
    currency: Currency,
    amount: number,
    trip: Trip,
    settings: Settings,
  ): { exchangeRate: number; accountingAmount: number } {
    const accountingCurrency = resolveAccountingCurrency(settings)
    const accountRate =
      accountType === AccountType.WHITE ? settings.usdWhite : settings.usdCash

    if (currency === accountingCurrency) {
      return {
        exchangeRate: accountRate,
        accountingAmount: CurrencyConverter.roundMoney(amount),
      }
    }

    if (accountRate <= 0) {
      throw new Error('La cotización debe ser mayor a cero')
    }

    return {
      exchangeRate: accountRate,
      accountingAmount: CurrencyConverter.convertToAccounting(
        amount,
        currency,
        accountingCurrency,
        accountRate,
      ),
    }
  }
}
