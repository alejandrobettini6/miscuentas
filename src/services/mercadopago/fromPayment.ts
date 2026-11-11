export interface MercadoPagoTestPayment {
  id: number | string
  status: string
  transaction_amount: number
  description: string | null
  date_created: string
  payment_type_id: string
}

export interface TestPaymentNotice {
  externalId: string
  title: string
  body: string
  postedAt: string
}

function formatArs(amount: number): string {
  const negative = amount < 0
  const abs = Math.abs(amount)
  const [intPart, decPart] = abs.toFixed(2).split('.')
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const body = decPart === '00' ? withThousands : `${withThousands},${decPart}`
  return negative ? `-${body}` : body
}

function cleanDetail(description: string | null): string {
  const text = (description ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
  if (!text || text.includes('@')) return 'Pago de prueba'
  return text.slice(0, 80)
}

/** Convierte un pago de la cuenta de prueba en el mismo texto que un aviso. */
export function noticeFromTestPayment(
  payment: MercadoPagoTestPayment,
): TestPaymentNotice | null {
  if (payment.status !== 'approved') return null
  if (!Number.isFinite(payment.transaction_amount) || payment.transaction_amount <= 0) {
    return null
  }
  const amount = formatArs(payment.transaction_amount)
  const detail = cleanDetail(payment.description)
  const transfer = payment.payment_type_id === 'bank_transfer'
  return {
    externalId: `mptest${payment.id}`,
    title: transfer ? `Transferiste $${amount}` : `Pagaste $${amount}`,
    body: transfer ? `a ${detail}` : `en ${detail}`,
    postedAt: payment.date_created,
  }
}
