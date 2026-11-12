import {
  categoryHintFromPayment,
  noticeFromTestPayment,
  paymentWithOrderCategory,
  type MercadoPagoOrderItem,
  type MercadoPagoTestPayment,
  type TestPaymentNotice,
} from './fromPayment'

const SEARCH_URL =
  'https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=20'

const orderItemsCache = new Map<string, MercadoPagoOrderItem[]>()

/** Lee cobros de la aplicación y devuelve solo el aviso, nunca el token. */
export async function fetchMercadoPagoNotices(token: string): Promise<TestPaymentNotice[]> {
  const response = await fetch(SEARCH_URL, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    throw new Error('Mercado Pago rechazó la consulta.')
  }
  const payload = (await response.json()) as { results?: MercadoPagoTestPayment[] }
  const payments = await Promise.all(
    (payload.results ?? []).map((payment) => withOrderCategory(payment, token)),
  )
  return payments
    .map((payment) => noticeFromTestPayment(payment))
    .filter((notice): notice is TestPaymentNotice => notice != null)
}

async function withOrderCategory(
  payment: MercadoPagoTestPayment,
  token: string,
): Promise<MercadoPagoTestPayment> {
  if (categoryHintFromPayment(payment)) return payment
  let current = payment
  const orderId = payment.order?.id
  if (orderId) {
    current = paymentWithOrderCategory(current, await merchantOrderItems(String(orderId), token))
    if (categoryHintFromPayment(current)) return current
  }
  const qrOrderId = payment.point_of_interaction?.references?.find(
    (reference) => reference?.type === 'ORDER_MP' && reference.id,
  )?.id
  if (!qrOrderId) return current
  return paymentWithOrderCategory(current, await qrOrderItems(String(qrOrderId), token))
}

async function qrOrderItems(orderId: string, token: string): Promise<MercadoPagoOrderItem[]> {
  const cached = orderItemsCache.get(orderId)
  if (cached) return cached
  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!response.ok) return []
    const order = (await response.json()) as { items?: MercadoPagoOrderItem[] }
    const items = order.items ?? []
    orderItemsCache.set(orderId, items)
    return items
  } catch {
    return []
  }
}

async function merchantOrderItems(
  orderId: string,
  token: string,
): Promise<MercadoPagoOrderItem[]> {
  const cached = orderItemsCache.get(`merchant:${orderId}`)
  if (cached) return cached
  try {
    const response = await fetch(
      `https://api.mercadopago.com/merchant_orders/${encodeURIComponent(orderId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!response.ok) return []
    const order = (await response.json()) as {
      items?: Array<{ title?: string; description?: string; category_id?: string }>
    }
    const items = (order.items ?? []).map((item) => ({
      title: item.title,
      description: item.description,
      category_id: item.category_id,
    }))
    orderItemsCache.set(`merchant:${orderId}`, items)
    return items
  } catch {
    return []
  }
}
