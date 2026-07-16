import { FIXED_CATEGORIES } from '@/constants/categories'
import { AccountType, Category, Currency, MonthMode, PeriodStatus } from '@/types/enums'
import type {
  Expense,
  ImportAccountsPayload,
  Period,
  Settings,
} from '@/types/models'
import { getMonthLabelFromKey, getYearMonthKey } from '@/utils/date'
import { createId } from '@/utils/id'
import {
  normalizeEnabledAccounts,
  normalizeEnabledCurrencies,
  normalizeEnabledFixedCategories,
  normalizeMonthMode,
} from './SettingsDefaults'
import { PeriodService } from './PeriodService'
import type { NormalizedImportPayload } from '@/repositories/interfaces'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const ACCOUNT_VALUES = new Set(Object.values(AccountType))
const CURRENCY_VALUES = new Set(Object.values(Currency))
const CATEGORY_VALUES = new Set(Object.values(Category))
const PERIOD_STATUS_VALUES = new Set(Object.values(PeriodStatus))

export interface ImportValidationResult {
  ok: boolean
  errors: string[]
  payload: NormalizedImportPayload | null
}

export class ImportService {
  static parseAndValidate(raw: string, userId: string): ImportValidationResult {
    const errors: string[] = []
    let parsed: unknown

    try {
      parsed = JSON.parse(raw)
    } catch {
      return { ok: false, errors: ['El archivo no es un JSON válido'], payload: null }
    }

    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, errors: ['El JSON debe ser un objeto'], payload: null }
    }

    const data = parsed as Record<string, unknown>
    const version = data.version
    if (version !== 1 && version !== 2) {
      errors.push('Versión no soportada (se espera 1 o 2)')
    }

    if (!data.settings || typeof data.settings !== 'object') {
      errors.push('Falta el bloque settings')
    }
    if (!Array.isArray(data.expenses)) {
      errors.push('Falta el arreglo expenses')
    }

    if (errors.length > 0) {
      return { ok: false, errors, payload: null }
    }

    const settingsRaw = data.settings as Record<string, unknown>
    const usdWhite = Number(settingsRaw.usdWhite)
    const usdCash = Number(settingsRaw.usdCash)
    const monthlyLimit = Number(settingsRaw.monthlyLimit)

    if (!(usdWhite > 0)) errors.push('settings.usdWhite debe ser > 0')
    if (!(usdCash > 0)) errors.push('settings.usdCash debe ser > 0')
    if (!(monthlyLimit >= 0) || Number.isNaN(monthlyLimit)) {
      errors.push('settings.monthlyLimit inválido')
    }

    const customCategories = Array.isArray(settingsRaw.customCategories)
      ? settingsRaw.customCategories.filter((c): c is string => typeof c === 'string')
      : []

    const settings: Settings = {
      userId,
      usdWhite,
      usdCash,
      monthlyLimit,
      customCategories,
      enabledAccounts: normalizeEnabledAccounts(settingsRaw.enabledAccounts),
      enabledCurrencies: normalizeEnabledCurrencies(settingsRaw.enabledCurrencies),
      enabledFixedCategories: normalizeEnabledFixedCategories(
        settingsRaw.enabledFixedCategories ?? FIXED_CATEGORIES,
      ),
      monthMode: normalizeMonthMode(settingsRaw.monthMode ?? MonthMode.AUTOMATIC),
      onboardingCompleted: Boolean(
        settingsRaw.onboardingCompleted === undefined
          ? true
          : settingsRaw.onboardingCompleted,
      ),
      updatedAt: new Date().toISOString(),
    }

    const expenseIds = new Set<string>()
    const rawExpenses = data.expenses as Array<Record<string, unknown>>
    const expensesDraft: Array<Omit<Expense, 'periodId'> & { periodId?: string; createdAt: string }> =
      []

    rawExpenses.forEach((item, index) => {
      const prefix = `expenses[${index}]`
      if (!item || typeof item !== 'object') {
        errors.push(`${prefix}: objeto inválido`)
        return
      }

      const id = String(item.id ?? '')
      if (!UUID_RE.test(id)) errors.push(`${prefix}.id inválido`)
      if (expenseIds.has(id)) errors.push(`${prefix}.id duplicado`)
      expenseIds.add(id)

      if (!ACCOUNT_VALUES.has(String(item.accountType) as AccountType)) {
        errors.push(`${prefix}.accountType inválido`)
      }
      if (!CATEGORY_VALUES.has(String(item.category) as Category)) {
        errors.push(`${prefix}.category inválido`)
      }
      if (!CURRENCY_VALUES.has(String(item.originalCurrency) as Currency)) {
        errors.push(`${prefix}.originalCurrency inválido`)
      }

      const originalAmount = Number(item.originalAmount)
      const exchangeRate = Number(item.exchangeRate)
      const usdAmount = Number(item.usdAmount)
      if (!Number.isFinite(originalAmount) || originalAmount === 0) {
        errors.push(`${prefix}.originalAmount inválido`)
      }
      if (!(exchangeRate > 0)) errors.push(`${prefix}.exchangeRate inválido`)
      if (!Number.isFinite(usdAmount)) errors.push(`${prefix}.usdAmount inválido`)

      const createdAt = String(item.createdAt ?? '')
      const updatedAt = String(item.updatedAt ?? createdAt)
      if (Number.isNaN(Date.parse(createdAt))) errors.push(`${prefix}.createdAt inválido`)

      expensesDraft.push({
        id,
        userId,
        periodId: typeof item.periodId === 'string' ? item.periodId : undefined,
        accountType: item.accountType as AccountType,
        category: item.category as Category,
        description:
          item.description === null || item.description === undefined
            ? null
            : String(item.description),
        originalCurrency: item.originalCurrency as Currency,
        originalAmount,
        exchangeRate,
        usdAmount,
        createdAt,
        updatedAt,
      })
    })

    let periods: Period[] = []
    const periodIds = new Set<string>()

    if (version === 2 && Array.isArray(data.periods)) {
      ;(data.periods as Array<Record<string, unknown>>).forEach((item, index) => {
        const prefix = `periods[${index}]`
        const id = String(item.id ?? '')
        if (!UUID_RE.test(id)) errors.push(`${prefix}.id inválido`)
        if (periodIds.has(id)) errors.push(`${prefix}.id duplicado`)
        periodIds.add(id)

        const yearMonth = String(item.yearMonth ?? '')
        if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
          errors.push(`${prefix}.yearMonth inválido`)
        }
        if (!PERIOD_STATUS_VALUES.has(String(item.status) as PeriodStatus)) {
          errors.push(`${prefix}.status inválido`)
        }

        periods.push({
          id,
          userId,
          label: String(item.label ?? getMonthLabelFromKey(yearMonth)),
          yearMonth,
          status: item.status as PeriodStatus,
          startedAt: String(item.startedAt ?? new Date().toISOString()),
          closedAt:
            item.closedAt === null || item.closedAt === undefined
              ? null
              : String(item.closedAt),
          monthlyLimitSnapshot:
            item.monthlyLimitSnapshot === null || item.monthlyLimitSnapshot === undefined
              ? null
              : Number(item.monthlyLimitSnapshot),
        })
      })
    } else {
      // v1: crear un período activo y asignar todos los movimientos.
      const active = PeriodService.buildPeriod(userId, getYearMonthKey(), {
        monthlyLimitSnapshot: monthlyLimit,
      })
      periods = [active]
      periodIds.add(active.id)
      for (const expense of expensesDraft) {
        expense.periodId = active.id
      }
    }

    const activeCount = periods.filter((p) => p.status === PeriodStatus.ACTIVE).length
    if (periods.length === 0) {
      errors.push('Debe haber al menos un período')
    } else if (activeCount !== 1) {
      // Autocorregir: el más reciente queda activo.
      const sorted = PeriodService.sortPeriods(periods)
      periods = sorted.map((p, index) => ({
        ...p,
        status: index === sorted.length - 1 ? PeriodStatus.ACTIVE : PeriodStatus.CLOSED,
        closedAt:
          index === sorted.length - 1
            ? null
            : p.closedAt ?? new Date().toISOString(),
      }))
    }

    const validPeriodIds = new Set(periods.map((p) => p.id))
    const fallbackPeriodId =
      PeriodService.getActive(periods)?.id ?? periods[0]?.id ?? createId()

    const expenses: Expense[] = expensesDraft.map((expense, index) => {
      const periodId = expense.periodId
      if (!periodId || !validPeriodIds.has(periodId)) {
        if (version === 2) {
          errors.push(`expenses[${index}].periodId no referencia un período válido`)
        }
        return { ...expense, periodId: fallbackPeriodId }
      }
      return { ...expense, periodId }
    })

    if (errors.length > 0) {
      return { ok: false, errors, payload: null }
    }

    const source: ImportAccountsPayload = {
      version: version as 1 | 2,
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : undefined,
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

    return {
      ok: true,
      errors: [],
      payload: { settings, periods, expenses, source },
    }
  }
}
