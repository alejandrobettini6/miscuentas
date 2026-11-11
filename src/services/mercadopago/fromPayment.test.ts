import { describe, expect, it } from 'vitest'
import { noticeFromTestPayment } from './fromPayment'

describe('noticeFromTestPayment', () => {
  it('convierte un pago aprobado en un aviso de gasto', () => {
    expect(
      noticeFromTestPayment({
        id: 12345678,
        status: 'approved',
        transaction_amount: 1500.5,
        description: 'Farmacity',
        date_created: '2026-11-11T18:00:00.000Z',
        payment_type_id: 'account_money',
      }),
    ).toEqual({
      externalId: 'mptest12345678',
      title: 'Pagaste $1.500,50',
      body: 'en Farmacity',
      postedAt: '2026-11-11T18:00:00.000Z',
    })
  })

  it('marca una transferencia bancaria', () => {
    const notice = noticeFromTestPayment({
      id: 99,
      status: 'approved',
      transaction_amount: 800,
      description: 'Juan',
      date_created: '2026-11-11T18:00:00.000Z',
      payment_type_id: 'bank_transfer',
    })
    expect(notice?.title).toBe('Transferiste $800')
    expect(notice?.body).toBe('a Juan')
  })

  it('ignora pagos rechazados', () => {
    expect(
      noticeFromTestPayment({
        id: 1,
        status: 'rejected',
        transaction_amount: 100,
        description: 'Farmacity',
        date_created: '2026-11-11T18:00:00.000Z',
        payment_type_id: 'account_money',
      }),
    ).toBeNull()
  })
})
