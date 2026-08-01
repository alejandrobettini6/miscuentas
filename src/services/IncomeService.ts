import type {
  CreateIncomeInput,
  Income,
  Settings,
  UpdateIncomeInput,
} from '@/types/models'
import { createId } from '@/utils/id'
import {
  isValidAmount,
} from '@/validators/amount'
import { ExpenseService } from './ExpenseService'

export class IncomeService {
  static buildIncome(
    userId: string,
    input: CreateIncomeInput,
    settings: Settings,
    now = new Date(),
  ): Income {
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

    const description = normalizeIncomeDescription(input.description)

    const { exchangeRate, accountingAmount: usdAmount } = ExpenseService.resolveAmounts(
      input.accountType,
      input.originalCurrency,
      input.originalAmount,
      settings,
    )

    const iso = now.toISOString()

    return {
      id: createId(),
      userId,
      periodId: input.periodId,
      accountType: input.accountType,
      description,
      originalCurrency: input.originalCurrency,
      originalAmount: input.originalAmount,
      exchangeRate,
      usdAmount,
      createdAt: iso,
      updatedAt: iso,
    }
  }

  static updateIncome(
    income: Income,
    input: UpdateIncomeInput,
    settings: Settings,
  ): Income {
    if (!isValidAmount(input.originalAmount)) {
      throw new Error('El importe debe ser mayor a cero')
    }
    if (!settings.enabledCurrencies.includes(input.originalCurrency)) {
      throw new Error('La moneda no está habilitada')
    }

    const accountType = input.accountType ?? income.accountType
    if (!settings.enabledAccounts.includes(accountType)) {
      throw new Error('La cuenta no está habilitada')
    }

    const description =
      input.description !== undefined
        ? normalizeIncomeDescription(input.description)
        : income.description

    const { exchangeRate, accountingAmount: usdAmount } = ExpenseService.resolveAmounts(
      accountType,
      input.originalCurrency,
      input.originalAmount,
      settings,
    )

    return {
      ...income,
      accountType,
      description,
      originalCurrency: input.originalCurrency,
      originalAmount: input.originalAmount,
      exchangeRate,
      usdAmount,
      updatedAt: new Date().toISOString(),
    }
  }
}

export function normalizeIncomeDescription(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim().replace(/\s+/g, ' ')
  if (trimmed.length === 0) return ''
  if (trimmed.length > 40) {
    throw new Error('Detalle inválido (máx. 40 caracteres)')
  }
  return trimmed
}

export function incomeDescriptionKey(description: string): string {
  return description.trim().toLowerCase()
}

export function incomeMatchesSource(income: Income, sourceLabel: string): boolean {
  return incomeDescriptionKey(income.description) === incomeDescriptionKey(sourceLabel)
}
