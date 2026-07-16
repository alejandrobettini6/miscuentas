import { ACCOUNT_LABELS, CATEGORY_LABELS, FIXED_CATEGORIES } from '@/constants/categories'
import { AccountType, Category, Currency } from '@/types/enums'
import type { Expense, Period, Settings } from '@/types/models'
import { formatDateParts } from '@/utils/date'
import { formatUsd } from '@/utils/formatters'
import { CategoryAggregator } from './CategoryAggregator'

export class ExportService {
  static toCsv(
    expenses: Expense[],
    options?: { enabledAccounts?: AccountType[]; customCategories?: string[] },
  ): string {
    const customCategories = options?.customCategories ?? []
    const enabled = new Set(
      options?.enabledAccounts ?? [AccountType.WHITE, AccountType.CASH],
    )
    const whiteRows = enabled.has(AccountType.WHITE)
      ? CategoryAggregator.buildRows(expenses, AccountType.WHITE, customCategories)
      : []
    const cashRows = enabled.has(AccountType.CASH)
      ? CategoryAggregator.buildRows(expenses, AccountType.CASH, customCategories)
      : []
    const max = Math.max(whiteRows.length, cashRows.length, 1)

    const lines = [
      `Categoría ${ACCOUNT_LABELS[AccountType.CASH]},Monto ${ACCOUNT_LABELS[AccountType.CASH]},Categoría ${ACCOUNT_LABELS[AccountType.WHITE]},Monto ${ACCOUNT_LABELS[AccountType.WHITE]}`,
    ]

    for (let i = 0; i < max; i++) {
      const cash = cashRows[i]
      const white = whiteRows[i]
      lines.push(
        [
          cash ? escapeCsv(cash.label) : '',
          cash ? escapeCsv(formatUsd(cash.totalUsd)) : '',
          white ? escapeCsv(white.label) : '',
          white ? escapeCsv(formatUsd(white.totalUsd)) : '',
        ].join(','),
      )
    }

    return lines.join('\n')
  }

  static toLogs(expenses: Expense[]): string {
    const header = [
      'Timestamp',
      'Fecha',
      'Hora',
      'Cuenta',
      'Categoría',
      'Detalle',
      'Moneda Original',
      'Importe Original',
      'Cotización',
      'USD Convertido',
      'Periodo',
    ].join(',')

    const sorted = [...expenses].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )

    const rows = sorted.map((expense) => {
      const { date, time } = formatDateParts(expense.createdAt)
      const categoryLabel =
        expense.category === Category.OTHER && expense.description
          ? expense.description
          : CATEGORY_LABELS[expense.category]
      const cotizacion =
        expense.originalCurrency === Currency.USD
          ? ''
          : escapeCsv(formatUsd(expense.exchangeRate))

      return [
        expense.createdAt,
        date,
        time,
        ACCOUNT_LABELS[expense.accountType],
        escapeCsv(categoryLabel),
        escapeCsv(expense.description ?? ''),
        expense.originalCurrency,
        escapeCsv(formatUsd(expense.originalAmount)),
        cotizacion,
        escapeCsv(formatUsd(expense.usdAmount)),
        expense.periodId,
      ].join(',')
    })

    return [header, ...rows].join('\n')
  }

  static toJson(
    expenses: Expense[],
    settings: Settings,
    periods: Period[] = [],
  ): string {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      settings: {
        usdWhite: settings.usdWhite,
        usdCash: settings.usdCash,
        monthlyLimit: settings.monthlyLimit,
        customCategories: settings.customCategories,
        enabledAccounts: settings.enabledAccounts,
        enabledCurrencies: settings.enabledCurrencies,
        enabledFixedCategories: settings.enabledFixedCategories,
        monthMode: settings.monthMode,
        onboardingCompleted: settings.onboardingCompleted,
      },
      categories: [
        ...FIXED_CATEGORIES.map((c) => CATEGORY_LABELS[c]),
        ...settings.customCategories,
      ],
      periods: periods.map((p) => ({
        id: p.id,
        label: p.label,
        yearMonth: p.yearMonth,
        status: p.status,
        startedAt: p.startedAt,
        closedAt: p.closedAt,
        monthlyLimitSnapshot: p.monthlyLimitSnapshot,
      })),
      expenses: expenses.map((e) => ({
        id: e.id,
        periodId: e.periodId,
        accountType: e.accountType,
        category: e.category,
        description: e.description,
        originalCurrency: e.originalCurrency,
        originalAmount: e.originalAmount,
        exchangeRate: e.exchangeRate,
        usdAmount: e.usdAmount,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
    }

    return JSON.stringify(payload, null, 2)
  }

  static download(filename: string, content: string, mime: string): void {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
