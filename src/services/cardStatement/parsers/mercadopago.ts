import {
  detectLineCurrency,
  extractInstallment,
  parseSpanishMonthDate,
  parseStatementAmount,
  SPANISH_MONTH_ABBR,
} from '../parseAmount'
import type {
  CardStatementParser,
  ParseOptions,
  ParsedMovement,
} from '../types'

const MONTHS = SPANISH_MONTH_ABBR

/**
 * Mercado Pago / Mercado Crédito card statement (real PDF format).
 *
 *   18/may   MERPAGO*PANINIAR   3 de 3   473689   $ 15.000,00
 *   29/jun   DLO*PedidosYa La Fabri   837931   $ 13.310,00
 *   3/jul   Pago de tarjeta   -$ 501.180,33
 */
function isSkippedDescription(description: string): boolean {
  return /^(pago de tarjeta|total a pagar del periodo anterior|subtotal|fecha)\b/i.test(
    description.trim(),
  )
}

function cleanDescription(raw: string): string {
  return raw
    .replace(/\s+(\d{1,2})\s+de\s+(\d{1,2})\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const MOVEMENT_RE = new RegExp(
  `(\\d{1,2})/(${MONTHS})\\s+(.+?)\\s+(?:(\\d{1,2})\\s+de\\s+(\\d{1,2})\\s+)?(\\d{4,})\\s+(-?\\$\\s*[\\d.]+,\\d{2})`,
  'gi',
)

function parseMatch(
  match: RegExpExecArray,
  yearHint?: number,
): ParsedMovement | null {
  const day = Number(match[1])
  const mon = match[2]
  const rawDesc = match[3]
  const cuotaA = match[4]
  const cuotaB = match[5]
  const amountRaw = match[7]

  if (isSkippedDescription(rawDesc)) return null

  const amount = parseStatementAmount(amountRaw)
  if (amount === null) return null

  const description = cleanDescription(rawDesc)
  if (!description) return null

  const installment =
    cuotaA && cuotaB
      ? `${Number(cuotaA)}/${Number(cuotaB)}`
      : extractInstallment(rawDesc)

  return {
    date: parseSpanishMonthDate(day, mon, yearHint),
    description,
    amount,
    currency: detectLineCurrency(match[0]),
    rawLine: match[0].trim(),
    installment,
  }
}

export const mercadopagoParser: CardStatementParser = {
  id: 'mercadopago',
  displayName: 'Mercado Pago',

  detect(text: string): number {
    const t = text.toLowerCase()
    let score = 0
    if (/mercado\s+pago/.test(t)) score += 0.55
    if (/mercadolibre/.test(t)) score += 0.35
    if (/mercado\s+cr[eé]dito/.test(t)) score += 0.25
    if (/detalle de movimientos/.test(t)) score += 0.2
    if (/tarjeta\s+virtual|con tarjeta virtual/.test(t)) score += 0.15
    if (/mercadopago|merpago\*/.test(t)) score += 0.15
    return Math.min(1, score)
  },

  parse(text: string, options?: ParseOptions): ParsedMovement[] {
    const yearHint = options?.yearHint
    const movements: ParsedMovement[] = []
    const seen = new Set<string>()

    MOVEMENT_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = MOVEMENT_RE.exec(text)) !== null) {
      const parsed = parseMatch(match, yearHint)
      if (!parsed) continue
      const key = `${parsed.date ?? ''}|${parsed.description}|${parsed.amount}|${parsed.rawLine}`
      if (seen.has(key)) continue
      seen.add(key)
      movements.push(parsed)
    }

    return movements
  },
}
