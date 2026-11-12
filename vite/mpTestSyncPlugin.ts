import type { Plugin } from 'vite'
import { loadEnv } from 'vite'
import {
  categoryHintFromPayment,
  noticeFromTestPayment,
  paymentWithOrderCategory,
  type MercadoPagoOrderItem,
  type MercadoPagoTestPayment,
} from '../src/services/mercadopago/fromPayment'

const SEARCH_URL =
  'https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=20'

const orderItemsCache = new Map<string, MercadoPagoOrderItem[]>()

/**
 * Solo en `vite dev`. Lee MP_ACCESS_TOKEN del entorno del servidor
 * y consulta pagos de prueba. El token no sale en la respuesta.
 */
export function mpTestSyncPlugin(): Plugin {
  return {
    name: 'mp-test-sync',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url ?? '').split('?')[0]
        if (path !== '/miscuentas/api/mp-test-sync') {
          next()
          return
        }
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.end()
          return
        }

        const env = loadEnv(server.config.mode, process.cwd(), '')
        const token = env.MP_ACCESS_TOKEN?.trim()
        if (!token) {
          json(res, 503, {
            error:
              'Falta MP_ACCESS_TOKEN en .env.local. Usá el Access Token de Credenciales de prueba.',
          })
          return
        }

        try {
          const response = await fetch(SEARCH_URL, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!response.ok) {
            json(res, 502, { error: 'Mercado Pago rechazó la consulta de prueba.' })
            return
          }
          const payload = (await response.json()) as {
            results?: MercadoPagoTestPayment[]
          }
          const payments = await Promise.all(
            (payload.results ?? []).map((payment) => withOrderCategory(payment, token)),
          )
          const notices = payments
            .map((payment) => noticeFromTestPayment(payment))
            .filter((notice) => notice != null)
          json(res, 200, { notices })
        } catch {
          json(res, 502, { error: 'No se pudo consultar Mercado Pago.' })
        }
      })
    },
  }
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

async function qrOrderItems(
  orderId: string,
  token: string,
): Promise<MercadoPagoOrderItem[]> {
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
  const cached = orderItemsCache.get(orderId)
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
    orderItemsCache.set(orderId, items)
    return items
  } catch {
    return []
  }
}

function json(
  res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void },
  status: number,
  body: unknown,
) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}
