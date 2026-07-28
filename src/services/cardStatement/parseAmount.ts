import { Currency } from '@/types/enums'

/**
 * Parse amounts as they appear in AR bank statement PDFs.
 * Accepts: "36.000,50", "36000,50", "1.234", "12,5", "1234.56" (US-style),
 * and "$ 15.000,00" / "-$ 501.180,33".
 * Returns null if invalid or <= 0.
 */
export function parseStatementAmount(raw: string): number | null {
  const original = raw.trim()
  if (/^\s*-/.test(original)) return null

  let trimmed = original.replace(/\s/g, '')
  trimmed = trimmed.replace(/^\$/, '')
  if (!trimmed) return null

  const hasComma = trimmed.includes(',')
  const hasDot = trimmed.includes('.')

  let normalized: string
  if (hasComma && hasDot) {
    // AR: 36.000,50  or rare US with thousands: 36,000.50
    const lastComma = trimmed.lastIndexOf(',')
    const lastDot = trimmed.lastIndexOf('.')
    if (lastComma > lastDot) {
      normalized = trimmed.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = trimmed.replace(/,/g, '')
    }
  } else if (hasComma) {
    // "36000,50" or "1.234" style without thousands: treat comma as decimal
    const parts = trimmed.split(',')
    if (parts.length === 2 && parts[1].length <= 2) {
      normalized = `${parts[0].replace(/\./g, '')}.${parts[1]}`
    } else {
      normalized = trimmed.replace(/,/g, '')
    }
  } else if (hasDot) {
    const parts = trimmed.split('.')
    // "36.000" (thousands) vs "36.50" (decimal)
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      normalized = trimmed.replace(/\./g, '')
    } else {
      normalized = trimmed
    }
  } else {
    normalized = trimmed
  }

  const value = Number(normalized)
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100) / 100
}

/** Detect currency hints on a statement line. Defaults to ARS. */
export function detectLineCurrency(line: string): Currency {
  const upper = line.toUpperCase()
  if (
    /\bUSD\b/.test(upper) ||
    /\bU\$S\b/.test(upper) ||
    /\bUS\$\b/.test(upper) ||
    /DOLARES?/.test(upper)
  ) {
    return Currency.USD
  }
  return Currency.ARS
}

function formatInstallment(a: string, b: string): string {
  return `${Number(a)}/${Number(b)}`
}

/** Match installment markers like "C.03/06", "3 de 3", "CUOTA 2 DE 6". */
export function extractInstallment(line: string): string | undefined {
  const cMatch = line.match(/\bC\.?\s*(\d{1,2})\s*\/\s*(\d{1,2})\b/i)
  if (cMatch) return formatInstallment(cMatch[1], cMatch[2])
  const cuota = line.match(/\bCUOTA\s+(\d{1,2})\s+(?:DE|\/)\s+(\d{1,2})\b/i)
  if (cuota) return formatInstallment(cuota[1], cuota[2])
  const de = line.match(/\b(\d{1,2})\s+de\s+(\d{1,2})\b/i)
  if (de) {
    const a = Number(de[1])
    const b = Number(de[2])
    if (a >= 1 && a <= b && b <= 48) return `${a}/${b}`
  }
  const slash = line.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/)
  if (slash) {
    const a = Number(slash[1])
    const b = Number(slash[2])
    if (a >= 1 && a <= b && b <= 48) return `${a}/${b}`
  }
  return undefined
}

const SPANISH_MONTHS: Record<string, number> = {
  ene: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dic: 12,
}

export const SPANISH_MONTH_ABBR =
  'ene|feb|mar|abr|may|jun|jul|ago|sep|sept|oct|nov|dic'

/**
 * Convert day + Spanish month abbreviation to ISO date.
 * e.g. (18, "may", 2026) → "2026-05-18"
 */
export function parseSpanishMonthDate(
  day: number,
  monAbbr: string,
  yearHint?: number,
): string | undefined {
  const month = SPANISH_MONTHS[monAbbr.toLowerCase()]
  if (!month || day < 1 || day > 31) return undefined
  const year = yearHint ?? new Date().getFullYear()
  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return undefined
  return iso
}

/** Infer year from period key `YYYY-MM` or fall back to current year. */
export function yearHintFromYearMonth(yearMonth: string | undefined): number {
  const m = yearMonth?.match(/^(\d{4})-\d{2}$/)
  if (m) return Number(m[1])
  return new Date().getFullYear()
}

/**
 * Convert DD/MM or DD/MM/YY or DD/MM/YYYY or D/mes to ISO date.
 * Year defaults to yearHint or current calendar year when missing.
 */
export function parseStatementDate(
  dayMonth: string,
  yearHint?: number,
): string | undefined {
  const spanish = dayMonth
    .trim()
    .match(new RegExp(`^(\\d{1,2})/(${SPANISH_MONTH_ABBR})$`, 'i'))
  if (spanish) {
    return parseSpanishMonthDate(Number(spanish[1]), spanish[2], yearHint)
  }

  const m = dayMonth.trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (!m) return undefined
  const day = Number(m[1])
  const month = Number(m[2])
  if (day < 1 || day > 31 || month < 1 || month > 12) return undefined

  let year = yearHint ?? new Date().getFullYear()
  if (m[3]) {
    year = Number(m[3])
    if (year < 100) year += 2000
  }

  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return undefined
  return iso
}
