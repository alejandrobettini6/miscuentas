import { AccountType, Category, Currency } from '@/types/enums'
import type { Expense, Income, IncomeSummary } from '@/types/models'
import {
  accountingAmountFromRecord,
  type ExchangeRates,
  type MonetaryRecord,
} from './AccountingCurrency'

export class IncomeSummaryCalculator {
  static calculate(
    incomes: Income[],
    expenses: Expense[],
    enabledFixedCategories: Category[],
    accountingCurrency: Currency = Currency.USD,
    rates: ExchangeRates = { usdWhite: 1, usdCash: 1 },
  ): IncomeSummary {
    const fixedSet = new Set(enabledFixedCategories)

    const incomeWhite = sumRecords(
      incomes.filter((i) => i.accountType === AccountType.WHITE),
      accountingCurrency,
      rates,
    )
    const incomeCash = sumRecords(
      incomes.filter((i) => i.accountType === AccountType.CASH),
      accountingCurrency,
      rates,
    )
    const totalIncome = round(incomeWhite + incomeCash)

    const fixedWhite = sumExpenses(
      expenses.filter(
        (e) =>
          e.accountType === AccountType.WHITE && fixedSet.has(e.category),
      ),
      accountingCurrency,
      rates,
    )
    const fixedCash = sumExpenses(
      expenses.filter(
        (e) => e.accountType === AccountType.CASH && fixedSet.has(e.category),
      ),
      accountingCurrency,
      rates,
    )
    const totalFixed = round(fixedWhite + fixedCash)

    const variableWhite = sumExpenses(
      expenses.filter(
        (e) => e.accountType === AccountType.WHITE && e.category === Category.OTHER,
      ),
      accountingCurrency,
      rates,
    )
    const variableCash = sumExpenses(
      expenses.filter(
        (e) => e.accountType === AccountType.CASH && e.category === Category.OTHER,
      ),
      accountingCurrency,
      rates,
    )
    const totalVariable = round(variableWhite + variableCash)

    const totalExpenses = round(totalFixed + totalVariable)
    const savings = round(totalIncome - totalExpenses)
    const savingsWithoutVariable = round(totalIncome - totalFixed)

    return {
      incomeWhite,
      incomeCash,
      totalIncome,
      fixedWhite,
      fixedCash,
      totalFixed,
      variableWhite,
      variableCash,
      totalVariable,
      totalExpenses,
      savings,
      savingsWithoutVariable,
    }
  }
}

function sumRecords(
  records: MonetaryRecord[],
  accountingCurrency: Currency,
  rates: ExchangeRates,
): number {
  return round(
    records.reduce(
      (acc, record) =>
        acc + accountingAmountFromRecord(record, accountingCurrency, rates),
      0,
    ),
  )
}

function sumExpenses(
  expenses: Expense[],
  accountingCurrency: Currency,
  rates: ExchangeRates,
): number {
  return sumRecords(expenses, accountingCurrency, rates)
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
