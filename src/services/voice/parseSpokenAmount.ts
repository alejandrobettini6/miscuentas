import { normalizeSearchText } from '@/services/ExpenseSearchService'
import { parseAmountInput } from '@/validators/amount'

const SMALL: Record<string, number> = {
  cero: 0,
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuno: 21,
  veintiun: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
}

const TENS: Record<string, number> = {
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
}

const HUNDREDS: Record<string, number> = {
  cien: 100,
  ciento: 100,
  doscientos: 200,
  trescientos: 300,
  cuatrocientos: 400,
  quinientos: 500,
  seiscientos: 600,
  setecientos: 700,
  ochocientos: 800,
  novecientos: 900,
}

const CONNECTORS = new Set(['y', 'coma'])

/** El dictado suele escribir 80 000 o 50.000; lo unimos antes de tokenizar. */
export function collapseThousandsSeparators(text: string): string {
  return text.replace(/\d{1,3}(?:[.\s]\d{3})+/g, (chunk) => chunk.replace(/[.\s]/g, ''))
}

function stripTokenPunctuation(token: string): string {
  if (/^\d{1,3}([.]\d{3})+([,]\d{1,2})?$/.test(token)) return token
  if (/^\d+([.,]\d+)?$/.test(token)) return token
  return token.replace(/^[^a-z0-9$]+|[^a-z0-9$]+$/g, '')
}

export function tokenizeVoiceText(text: string): string[] {
  const normalized = normalizeSearchText(text)
    .replace(/(\d)([a-z$])/gi, '$1 $2')
    .replace(/([a-z$])(\d)/gi, '$1 $2')
  return collapseThousandsSeparators(normalized)
    .replace(/[¿?¡!;:]/g, ' ')
    .split(/\s+/)
    .map(stripTokenPunctuation)
    .filter(Boolean)
}

export function isDigitAmountToken(token: string): boolean {
  if (/^\d+$/.test(token)) return true
  return parseVoiceDigitToken(token) !== null
}

/** 80,000 (miles US) vs 128,2 (decimal AR). */
export function parseVoiceDigitToken(token: string): number | null {
  const trimmed = token.trim().replace(/^\$/, '')
  if (!trimmed) return null

  if (/^\d{1,3}([.]\d{3})+$/.test(trimmed) || /^\d{1,3}([,]\d{3})+$/.test(trimmed)) {
    const value = Number(trimmed.replace(/[.,]/g, ''))
    return Number.isFinite(value) && value > 0 ? value : null
  }

  if (/^\d{1,3}([.]\d{3})+,\d{1,2}$/.test(trimmed)) {
    return parseAmountInput(trimmed)
  }

  if (/^\d{1,3}([,]\d{3})+\.\d{1,2}$/.test(trimmed)) {
    const value = Number(trimmed.replace(/,/g, ''))
    return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null
  }

  return parseAmountInput(trimmed)
}

export function isNumberishToken(token: string): boolean {
  if (CONNECTORS.has(token)) return true
  if (token === 'mil') return true
  if (token in SMALL || token in TENS || token in HUNDREDS) return true
  return isDigitAmountToken(token)
}

function parseDigitToken(token: string): number | null {
  return parseVoiceDigitToken(token)
}

function parseSpanishInteger(tokens: string[]): number | null {
  const filtered = tokens.filter((t) => t !== 'y')
  if (filtered.length === 0) return null

  let total = 0
  let current = 0
  let used = false

  for (const token of filtered) {
    const digit = parseDigitToken(token)
    if (digit !== null && !(token in SMALL) && !(token in TENS) && !(token in HUNDREDS) && token !== 'mil') {
      current += digit
      used = true
      continue
    }
    if (token in SMALL) {
      current += SMALL[token]!
      used = true
      continue
    }
    if (token in TENS) {
      current += TENS[token]!
      used = true
      continue
    }
    if (token in HUNDREDS) {
      current += HUNDREDS[token]!
      used = true
      continue
    }
    if (token === 'mil') {
      total += (current || 1) * 1000
      current = 0
      used = true
      continue
    }
    return null
  }

  if (!used) return null
  return total + current
}

function parseSpacedDigitGroups(tokens: string[]): number | null {
  if (tokens.length < 2 || !tokens.every((t) => /^\d+$/.test(t))) return null
  const [first, ...rest] = tokens
  if (!first || rest.length === 0) return null
  if (!rest.every((t) => t.length === 3)) return null
  const value = Number(first + rest.join(''))
  return Number.isFinite(value) && value > 0 ? value : null
}

/** Parsea un tramo de tokens: "cincuenta mil", "128,2", "ciento veintiocho coma dos". */
export function parseSpokenAmountTokens(tokens: string[]): number | null {
  if (tokens.length === 0) return null
  if (tokens.every((t) => t === 'y' || t === 'coma')) return null

  const spacedDigits = parseSpacedDigitGroups(tokens)
  if (spacedDigits !== null) return spacedDigits

  if (tokens.length === 1) {
    return parseDigitToken(tokens[0]!) ?? parseSpanishInteger(tokens)
  }

  const comaIdx = tokens.indexOf('coma')
  if (comaIdx >= 0) {
    const intPart = parseSpanishInteger(tokens.slice(0, comaIdx))
    const decPart = parseSpanishInteger(tokens.slice(comaIdx + 1))
    if (intPart === null || decPart === null) return null
    const decDigits = String(Math.abs(Math.trunc(decPart)))
    const decimal = Number(`0.${decDigits}`)
    if (!Number.isFinite(decimal)) return null
    return Math.round((intPart + decimal) * 100) / 100
  }

  return parseSpanishInteger(tokens)
}

export interface FoundSpokenAmount {
  value: number
  start: number
  end: number
}

/** Busca el último monto reconocible en la lista de tokens. */
export function findSpokenAmount(tokens: string[]): FoundSpokenAmount | null {
  let found: FoundSpokenAmount | null = null

  let i = 0
  while (i < tokens.length) {
    if (!isNumberishToken(tokens[i]!)) {
      i += 1
      continue
    }
    let j = i
    while (j < tokens.length && isNumberishToken(tokens[j]!)) j += 1
    const slice = tokens.slice(i, j)
    const trimmed = trimConnectors(slice)
    const value = parseSpokenAmountTokens(trimmed)
    if (value !== null && value > 0) {
      found = { value, start: i, end: j }
    }
    i = j
  }

  return found
}

function trimConnectors(tokens: string[]): string[] {
  let start = 0
  let end = tokens.length
  while (start < end && CONNECTORS.has(tokens[start]!)) start += 1
  while (end > start && CONNECTORS.has(tokens[end - 1]!)) end -= 1
  return tokens.slice(start, end)
}
