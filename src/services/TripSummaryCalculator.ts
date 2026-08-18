import { AccountType, BudgetColor, Currency } from '@/types/enums'
import type { TripExpense } from '@/types/models'
import { accountingAmountFromRecord, type ExchangeRates } from './AccountingCurrency'

export interface TripSummary {
  totalWhite: number
  totalCash: number
  totalSpent: number
  available: number
  remainingPercent: number
}

export class TripSummaryCalculator {
  static calculate(
    expenses: TripExpense[],
    budgetLimit: number | null,
    accountingCurrency: Currency,
    rates: ExchangeRates,
  ): TripSummary {
    const totalWhite = sumByAccount(expenses, AccountType.WHITE, accountingCurrency, rates)
    const totalCash = sumByAccount(expenses, AccountType.CASH, accountingCurrency, rates)
    const totalSpent = round(totalWhite + totalCash)
    const limit = budgetLimit ?? 0
    const available = round(limit - totalSpent)
    const remainingPercent =
      limit <= 0 ? (available < 0 ? 0 : 100) : (available / limit) * 100

    return {
      totalWhite,
      totalCash,
      totalSpent,
      available,
      remainingPercent,
    }
  }

  static resolveBudgetColor(remainingPercent: number, available: number): BudgetColor {
    if (available < 0) return BudgetColor.RED
    if (remainingPercent < 10) return BudgetColor.ORANGE
    if (remainingPercent <= 20) return BudgetColor.YELLOW
    return BudgetColor.GREEN
  }

  static progressRatio(available: number, budgetLimit: number | null): number {
    const limit = budgetLimit ?? 0
    if (limit <= 0) return available < 0 ? 0 : 1
    return Math.max(0, Math.min(1, available / limit))
  }
}

function sumByAccount(
  expenses: TripExpense[],
  account: AccountType,
  accountingCurrency: Currency,
  rates: ExchangeRates,
): number {
  return round(
    expenses
      .filter((e) => e.accountType === account)
      .reduce((acc, e) => acc + accountingAmountFromRecord(e, accountingCurrency, rates), 0),
  )
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
