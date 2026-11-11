import { ACCOUNT_LABELS, CATEGORY_LABELS, CURRENCY_LABELS } from '@/constants/categories'
import { normalizeSearchText } from '@/services/ExpenseSearchService'
import { AccountType, Category, Currency } from '@/types/enums'
import {
  isValidCustomCategoryName,
  normalizeCustomCategoryName,
} from '@/validators/amount'
import {
  allKnownFixedLabels,
  buildCategoryAliasMap,
  lookupFixedCategory,
} from './categoryAliases'
import { detectSpokenCurrency } from './detectSpokenCurrency'
import { findSpokenAmount, tokenizeVoiceText } from './parseSpokenAmount'
import type {
  VoiceExpenseDraft,
  VoiceInterpretContext,
  VoiceInterpretResult,
  VoiceInterpreter,
} from './types'

const COMMAND_VERBS = new Set([
  'agrega',
  'agregar',
  'agregame',
  'agregame',
  'anade',
  'anadir',
  'anademe',
  'pone',
  'pon',
  'poneme',
  'mete',
  'meteme',
  'registra',
  'registrar',
  'registrame',
  'carga',
  'cargar',
  'cargame',
  'suma',
  'sumar',
  'sumame',
])

const SKIP_REMAINING = new Set([
  'por',
  'de',
  'del',
  'al',
  'a',
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'me',
  'en',
  'con',
  'para',
  'americanos',
  'americano',
  'argentinos',
  'argentino',
])

const USD_TOKENS = new Set([
  'dolar',
  'dolares',
  'dollar',
  'dollars',
  'usd',
  'u$s',
  'us$',
])

const ARS_TOKENS = new Set(['peso', 'pesos', 'ars', 'argentinos'])

function isCommandVerb(token: string): boolean {
  return COMMAND_VERBS.has(token)
}

function isUsdToken(token: string): boolean {
  return USD_TOKENS.has(token)
}

export class RuleVoiceInterpreter implements VoiceInterpreter {
  interpret(transcript: string, context: VoiceInterpretContext): VoiceInterpretResult {
    const raw = transcript.trim()
    if (!raw) {
      return { status: 'error', message: 'No se escuchó nada. Probá de nuevo.', transcript: raw }
    }

    const tokens = tokenizeVoiceText(raw)
    if (tokens.length === 0) {
      return { status: 'error', message: 'No se escuchó nada. Probá de nuevo.', transcript: raw }
    }

    const { accountType, accountExplicit, consumed: accountIdxs } = extractAccount(tokens)
    const { currency: tokenCurrency, consumed: currencyIdxs } = extractCurrency(tokens)
    const textCurrency = detectSpokenCurrency(raw)
    const currency = textCurrency ?? tokenCurrency
    const currencyExplicit = textCurrency != null || tokenCurrency != null
    const amountHit = findSpokenAmount(tokens)

    if (!amountHit) {
      return {
        status: 'needs_ai',
        transcript: raw,
      }
    }

    const consumed = new Set<number>([...accountIdxs, ...currencyIdxs])
    for (let i = amountHit.start; i < amountHit.end; i++) consumed.add(i)

    const remaining = tokens
      .filter((_, i) => !consumed.has(i))
      .filter((t) => !isCommandVerb(t) && !/^0+$/.test(t))

    const resolvedAccount = resolveAccount(accountType, accountExplicit, context)
    if (resolvedAccount.status === 'error') {
      return { status: 'error', message: resolvedAccount.message, transcript: raw }
    }

    const resolvedCurrency = resolveCurrency(currency, currencyExplicit, context)
    if (resolvedCurrency.status === 'error') {
      return { status: 'error', message: resolvedCurrency.message, transcript: raw }
    }

    const categoryHit = matchCategory(remaining, context)
    if (!categoryHit) {
      return { status: 'needs_ai', transcript: raw }
    }
    if ('error' in categoryHit) {
      return { status: 'error', message: categoryHit.error, transcript: raw }
    }

    const draft: VoiceExpenseDraft = {
      accountType: resolvedAccount.accountType,
      category: categoryHit.category,
      description: categoryHit.description,
      originalAmount: amountHit.value,
      originalCurrency: resolvedCurrency.currency,
      monthOnlyCategory: categoryHit.monthOnlyCategory,
      label: categoryHit.label,
    }

    return { status: 'ok', draft, transcript: raw }
  }
}

function extractAccount(tokens: string[]): {
  accountType: AccountType | null
  accountExplicit: boolean
  consumed: number[]
} {
  const consumed: number[] = []
  let accountType: AccountType | null = null

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!
    const prev = i > 0 ? tokens[i - 1] : ''
    if (token === 'negro' || token === 'cash') {
      accountType = AccountType.CASH
      consumed.push(i)
      if (prev === 'en') consumed.push(i - 1)
    } else if (token === 'blanco' || token === 'white') {
      accountType = AccountType.WHITE
      consumed.push(i)
      if (prev === 'en') consumed.push(i - 1)
    }
  }

  return { accountType, accountExplicit: accountType !== null, consumed }
}

function extractCurrency(tokens: string[]): {
  currency: Currency | null
  currencyExplicit: boolean
  consumed: number[]
} {
  const consumed: number[] = []
  let currency: Currency | null = null

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!
    if (token === 'peso' || token === 'pesos' || token === 'ars' || ARS_TOKENS.has(token)) {
      currency = Currency.ARS
      consumed.push(i)
    } else if (isUsdToken(token)) {
      currency = Currency.USD
      consumed.push(i)
    }
  }

  return { currency, currencyExplicit: currency !== null, consumed }
}

function resolveAccount(
  spoken: AccountType | null,
  explicit: boolean,
  context: VoiceInterpretContext,
): { status: 'ok'; accountType: AccountType } | { status: 'error'; message: string } {
  if (explicit && spoken) {
    if (!context.enabledAccounts.includes(spoken)) {
      return {
        status: 'error',
        message: accountDisabledMessage(spoken, context.enabledAccounts),
      }
    }
    return { status: 'ok', accountType: spoken }
  }

  if (context.enabledAccounts.length === 1) {
    return { status: 'ok', accountType: context.enabledAccounts[0]! }
  }

  if (context.activeAccountType && context.enabledAccounts.includes(context.activeAccountType)) {
    return { status: 'ok', accountType: context.activeAccountType }
  }

  return {
    status: 'error',
    message: 'Aclará si es en blanco o en negro.',
  }
}

function resolveCurrency(
  spoken: Currency | null,
  explicit: boolean,
  context: VoiceInterpretContext,
): { status: 'ok'; currency: Currency } | { status: 'error'; message: string } {
  const currency = explicit && spoken ? spoken : Currency.ARS
  if (!context.enabledCurrencies.includes(currency)) {
    return {
      status: 'error',
      message: currencyDisabledMessage(currency, context.enabledCurrencies),
    }
  }
  return { status: 'ok', currency }
}

function currencyDisabledMessage(wanted: Currency, enabled: Currency[]): string {
  const have = enabled.map((c) => CURRENCY_LABELS[c].toLowerCase()).join(' y ')
  const want = CURRENCY_LABELS[wanted]
  if (enabled.length === 0) {
    return `No hay monedas habilitadas. Activá ${want} en Ajustes para registrar esto.`
  }
  return `Solo tenés habilitado ${have}. Para cargar ${want.toLowerCase()}, activá ${want} en Ajustes.`
}

function accountDisabledMessage(wanted: AccountType, enabled: AccountType[]): string {
  const have = enabled.map((a) => ACCOUNT_LABELS[a]).join(' y ')
  const want = ACCOUNT_LABELS[wanted]
  if (enabled.length === 0) {
    return `No hay cuentas habilitadas. Activá ${want} en Ajustes para registrar esto.`
  }
  return `Solo tenés habilitado ${have}. Para cargar en ${want.toLowerCase()}, activá ${want} en Ajustes.`
}

interface CategoryHit {
  category: Category
  description: string | null
  monthOnlyCategory: boolean
  label: string
}

function matchCategory(
  remaining: string[],
  context: VoiceInterpretContext,
): CategoryHit | { error: string } | null {
  const tokens = remaining.filter((t) => !SKIP_REMAINING.has(t) && !isCommandVerb(t))
  if (tokens.length === 0) return null

  const aliasMap = buildCategoryAliasMap(context.enabledFixedCategories)

  for (let start = 0; start < tokens.length; start++) {
    for (let len = Math.min(tokens.length - start, 4); len >= 1; len--) {
      const slice = tokens.slice(start, start + len)
      const phrase = slice.join(' ')
      const normalized = normalizeSearchText(phrase)

      const disabledFixed = lookupFixedCategory(phrase)
      if (
        start === 0 &&
        disabledFixed &&
        disabledFixed !== Category.OTHER &&
        !context.enabledFixedCategories.includes(disabledFixed)
      ) {
        return {
          error: `${CATEGORY_LABELS[disabledFixed]} está desactivada. Activala en Ajustes para registrar ahí.`,
        }
      }

      const fixed = aliasMap.get(normalized)
      if (fixed) {
        const rest = [...tokens.slice(0, start), ...tokens.slice(start + len)]
        const description = rest.length > 0 ? joinDescription(rest) : null
        if (description && !isValidCustomCategoryName(description)) return null
        return {
          category: fixed,
          description,
          monthOnlyCategory: false,
          label: CATEGORY_LABELS[fixed],
        }
      }

      const custom = findNamed(phrase, context.customCategories)
      if (custom) {
        return {
          category: Category.OTHER,
          description: custom,
          monthOnlyCategory: false,
          label: custom,
        }
      }

      const month = findNamed(phrase, context.monthOnlyCategories)
      if (month) {
        return {
          category: Category.OTHER,
          description: month,
          monthOnlyCategory: true,
          label: month,
        }
      }
    }
  }

  const name = joinDescription(tokens)
  if (!name || !isValidCustomCategoryName(name)) return null
  if (allKnownFixedLabels().includes(normalizeSearchText(name))) return null

  return {
    category: Category.OTHER,
    description: name,
    monthOnlyCategory: true,
    label: name,
  }
}

function findNamed(phrase: string, names: string[]): string | null {
  const normalized = normalizeSearchText(phrase)
  return names.find((name) => normalizeSearchText(name) === normalized) ?? null
}

function joinDescription(tokens: string[]): string {
  return normalizeCustomCategoryName(tokens.join(' '))
}
