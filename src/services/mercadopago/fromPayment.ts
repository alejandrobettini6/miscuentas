export interface MercadoPagoOrderItem {
  title?: string | null
  description?: string | null
  category_id?: string | null
  external_categories?: Array<{ id?: string | null }> | null
}

export interface MercadoPagoTestPayment {
  id: number | string
  status: string
  transaction_amount: number
  description: string | null
  date_created: string
  payment_type_id: string
  /** Ítems del QR, si Mercado Pago los devuelve en el pago. */
  items?: MercadoPagoOrderItem[] | null
  additional_info?: { items?: MercadoPagoOrderItem[] | null } | null
  order?: { id?: string | number | null } | null
  point_of_interaction?: {
    references?: Array<{ id?: string | null; type?: string | null }> | null
  } | null
}

export interface TestPaymentNotice {
  externalId: string
  title: string
  body: string
  postedAt: string
  /** Id o nombre de categoría que vino en el ítem, si hay uno solo. */
  categoryHint?: string
}

function formatArs(amount: number): string {
  const negative = amount < 0
  const abs = Math.abs(amount)
  const [intPart, decPart] = abs.toFixed(2).split('.')
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const body = decPart === '00' ? withThousands : `${withThousands},${decPart}`
  return negative ? `-${body}` : body
}

function cleanText(value: string | null | undefined): string | null {
  const text = (value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
  if (!text || text.includes('@')) return null
  return text.slice(0, 80)
}

function itemHasCategory(item: MercadoPagoOrderItem): boolean {
  if (cleanText(item.category_id)) return true
  return (item.external_categories ?? []).some((category) => cleanText(category?.id))
}

function orderItems(payment: MercadoPagoTestPayment): MercadoPagoOrderItem[] {
  return [...(payment.items ?? []), ...(payment.additional_info?.items ?? [])]
}

/** Suma la categoría de la orden comercial cuando el pago no la trae. */
export function paymentWithOrderCategory(
  payment: MercadoPagoTestPayment,
  orderItems: MercadoPagoOrderItem[],
): MercadoPagoTestPayment {
  if (categoryHintFromPayment(payment)) return payment
  const withCategory = orderItems.filter(itemHasCategory)
  if (withCategory.length === 0) return payment
  return { ...payment, items: [...(payment.items ?? []), ...withCategory] }
}

/** El id de categoría del ítem, solo si todos los ítems dicen lo mismo. */
export function categoryHintFromPayment(payment: MercadoPagoTestPayment): string | undefined {
  const values: string[] = []
  for (const item of orderItems(payment)) {
    for (const category of item.external_categories ?? []) {
      const id = cleanText(category?.id)
      if (id) values.push(id)
    }
    const categoryId = cleanText(item.category_id)
    if (categoryId) values.push(categoryId)
  }
  const unique = [...new Map(values.map((value) => [value.toLowerCase(), value])).values()]
  return unique.length === 1 ? unique[0] : undefined
}

function detailFromPayment(payment: MercadoPagoTestPayment): string {
  for (const item of orderItems(payment)) {
    const title = cleanText(item.title)
    if (title) return title
  }
  const description = cleanText(payment.description)
  if (description) return description
  for (const item of orderItems(payment)) {
    const itemDescription = cleanText(item.description)
    if (itemDescription) return itemDescription
  }
  return 'Pago de prueba'
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
  const detail = detailFromPayment(payment)
  const transfer = payment.payment_type_id === 'bank_transfer'
  const categoryHint = categoryHintFromPayment(payment)
  return {
    externalId: `mptest${payment.id}`,
    title: transfer ? `Transferiste $${amount}` : `Pagaste $${amount}`,
    body: transfer ? `a ${detail}` : `en ${detail}`,
    postedAt: payment.date_created,
    ...(categoryHint ? { categoryHint } : {}),
  }
}
