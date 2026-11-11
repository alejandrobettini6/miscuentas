import { describe, expect, it } from 'vitest'
import { parseMercadoPagoNotification } from './parseNotification'

describe('parseMercadoPagoNotification', () => {
  it('lee un pago con monto y comercio', () => {
    expect(
      parseMercadoPagoNotification('Pagaste $1.500', 'en Farmacity'),
    ).toEqual({
      kind: 'payment',
      amount: 1500,
      merchant: 'Farmacity',
    })
  })

  it('lee decimales con coma', () => {
    expect(
      parseMercadoPagoNotification('', 'Pagaste $1.500,50 a Carrefour'),
    ).toEqual({
      kind: 'payment',
      amount: 1500.5,
      merchant: 'Carrefour',
    })
  })

  it('trata una transferencia como transferencia', () => {
    expect(
      parseMercadoPagoNotification('Transferencia', 'Le transferiste $800 a Juan Pérez'),
    ).toEqual({
      kind: 'transfer',
      amount: 800,
      merchant: 'Juan Pérez',
    })
  })

  it('ignora plata recibida', () => {
    expect(parseMercadoPagoNotification('Recibiste $2.000', 'de Ana')).toBeNull()
  })

  it('ignora avisos sin monto', () => {
    expect(parseMercadoPagoNotification('Mercado Pago', 'Mirá las promos')).toBeNull()
  })
})
