import { ACCOUNT_LABELS, CATEGORY_LABELS, FIXED_CATEGORIES } from '@/constants/categories'
import { AccountType, Category, Currency } from '@/types/enums'
import type { Expense, Settings } from '@/types/models'
import { formatDateParts } from '@/utils/date'
import { formatUsd } from '@/utils/formatters'
import { CategoryAggregator } from './CategoryAggregator'

export class ExportService {
  static toCsv(expenses: Expense[]): string {
    const whiteRows = CategoryAggregator.buildRows(expenses, AccountType.WHITE)
    const cashRows = CategoryAggregator.buildRows(expenses, AccountType.CASH)
    const max = Math.max(whiteRows.length, cashRows.length, 1)

    const lines = ['Categoría Barrani,Monto Barrani,Categoría Blanco,Monto Blanco']

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
      ].join(',')
    })

    return [header, ...rows].join('\n')
  }

  static toJson(expenses: Expense[], settings: Settings): string {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: {
        usdWhite: settings.usdWhite,
        usdCash: settings.usdCash,
        monthlyLimit: settings.monthlyLimit,
      },
      categories: FIXED_CATEGORIES.map((c) => CATEGORY_LABELS[c]),
      expenses: expenses.map((e) => ({
        id: e.id,
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
