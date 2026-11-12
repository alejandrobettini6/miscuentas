import type { Plugin } from 'vite'
import { loadEnv } from 'vite'
import { fetchMercadoPagoNotices } from '../src/services/mercadopago/fetchNotices'

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
          const notices = await fetchMercadoPagoNotices(token)
          json(res, 200, { notices })
        } catch {
          json(res, 502, { error: 'Mercado Pago rechazó la consulta de prueba.' })
        }
      })
    },
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
