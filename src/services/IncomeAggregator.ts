import { ACCOUNT_LABELS } from '@/constants/categories'
import { AccountType, Currency } from '@/types/enums'
import type { Income, IncomeRow } from '@/types/models'
import { accountingAmountFromRecord, type ExchangeRates } from './AccountingCurrency'

export class IncomeAggregator {
  static buildRows(
    incomes: Income[],
    enabledAccounts: AccountType[] = [AccountType.WHITE, AccountType.CASH],
    accountingCurrency: Currency = Currency.USD,
    rates: ExchangeRates = { usdWhite: 1, usdCash: 1 },
  ): IncomeRow[] {
    return enabledAccounts.map((accountType) => {
      const items = incomes.filter((income) => income.accountType === accountType)
      const totalUsd = round(
        items.reduce(
          (acc, income) =>
            acc + accountingAmountFromRecord(income, accountingCurrency, rates),
          0,
        ),
      )
      return {
        accountType,
        label: ACCOUNT_LABELS[accountType],
        totalUsd,
        lastIncome: latest(items),
      }
    })
  }

  static incomesForRow(incomes: Income[], row: Pick<IncomeRow, 'accountType'>): Income[] {
    return incomes
      .filter((income) => income.accountType === row.accountType)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
}

function latest(items: Income[]): Income | null {
  if (items.length === 0) return null
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0] ?? null
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
