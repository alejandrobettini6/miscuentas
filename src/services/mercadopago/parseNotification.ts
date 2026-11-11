export type MercadoPagoNoticeKind = 'payment' | 'transfer'

export interface ParsedMercadoPagoNotice {
  kind: MercadoPagoNoticeKind
  amount: number
  merchant: string
}

const INCOMING =
  /recibiste|te enviaron|te transfirieron|te mandaron|ingres[oó] dinero|rendimiento/i
const TRANSFER =
  /transferiste|le transferiste|enviaste|le enviaste|transferencia enviada/i
const PAYMENT = /pagaste|pago con qr|pagaste con qr|pago aprobado|\bqr\b/i

const MONEY =
  /\$?\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/

function parseArsAmount(text: string): number | null {
  const match = text.match(MONEY)
  if (!match?.[1]) return null
  const intPart = match[1].replace(/\./g, '')
  const decimals = match[2] ?? '0'
  const value = Number(`${intPart}.${decimals}`)
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100) / 100
}

function merchantAfterAmount(text: string): string {
  const withoutMoney = text.replace(MONEY, ' ')
  const match = withoutMoney.match(
    /(?:\ba|\ben)\s+(.+?)(?:\s+con\s+mercado\s*pago)?$/i,
  )
  const raw = (match?.[1] ?? '').replace(/[.]+$/g, '').trim()
  return raw.replace(/\s+/g, ' ')
}

/** Lee el texto de una notificación de la app de Mercado Pago. */
export function parseMercadoPagoNotification(
  title: string,
  body: string,
): ParsedMercadoPagoNotice | null {
  const text = `${title} ${body}`.replace(/\s+/g, ' ').trim()
  if (!text || INCOMING.test(text)) return null

  const amount = parseArsAmount(text)
  if (amount == null) return null

  const merchant = merchantAfterAmount(text)
  if (TRANSFER.test(text)) {
    return { kind: 'transfer', amount, merchant }
  }
  if (PAYMENT.test(text)) {
    return { kind: 'payment', amount, merchant }
  }
  return null
}
