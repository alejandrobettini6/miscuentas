import { AccountType, BudgetColor, Currency } from '@/types/enums'
import type { Expense, MonthlySummary } from '@/types/models'
import { accountingAmount } from './AccountingCurrency'

export class SummaryCalculator {
  static calculate(
    expenses: Expense[],
    monthlyLimit: number,
    accountingCurrency: Currency = Currency.USD,
  ): MonthlySummary {
    const totalWhite = sumByAccount(expenses, AccountType.WHITE, accountingCurrency)
    const totalCash = sumByAccount(expenses, AccountType.CASH, accountingCurrency)
    const totalSpent = round(totalWhite + totalCash)
    const available = round(monthlyLimit - totalSpent)
    const remainingPercent =
      monthlyLimit <= 0 ? (available < 0 ? 0 : 100) : (available / monthlyLimit) * 100

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

  static progressRatio(available: number, monthlyLimit: number): number {
    if (monthlyLimit <= 0) return available < 0 ? 0 : 1
    return Math.max(0, Math.min(1, available / monthlyLimit))
  }
}

function sumByAccount(
  expenses: Expense[],
  account: AccountType,
  accountingCurrency: Currency,
): number {
  return round(
    expenses
      .filter((e) => e.accountType === account)
      .reduce((acc, e) => acc + accountingAmount(e, accountingCurrency), 0),
  )
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
