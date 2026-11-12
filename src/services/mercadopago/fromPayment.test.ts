import { describe, expect, it } from 'vitest'
import { noticeFromTestPayment, paymentWithOrderCategory } from './fromPayment'

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

  it('toma la categoría del ítem y deja el título como detalle', () => {
    const notice = noticeFromTestPayment({
      id: 15,
      status: 'approved',
      transaction_amount: 15,
      description: 'DESCRIPTION',
      date_created: '2026-11-11T18:00:00.000Z',
      payment_type_id: 'account_money',
      items: [
        {
          title: 'TITLE',
          description: 'DESCRIPTION',
          external_categories: [{ id: 'SALUD' }],
        },
      ],
    })
    expect(notice?.body).toBe('en TITLE')
    expect(notice?.categoryHint).toBe('SALUD')
  })

  it('lee category_id si el pago viene con additional_info', () => {
    const notice = noticeFromTestPayment({
      id: 16,
      status: 'approved',
      transaction_amount: 15,
      description: null,
      date_created: '2026-11-11T18:00:00.000Z',
      payment_type_id: 'account_money',
      additional_info: {
        items: [{ title: 'Farmacity', category_id: 'farmacia' }],
      },
    })
    expect(notice?.categoryHint).toBe('farmacia')
  })

  it('no elige categoría si los ítems traen dos distintas', () => {
    const notice = noticeFromTestPayment({
      id: 17,
      status: 'approved',
      transaction_amount: 15,
      description: 'DESCRIPTION',
      date_created: '2026-11-11T18:00:00.000Z',
      payment_type_id: 'account_money',
      items: [
        { title: 'TITLE', external_categories: [{ id: 'SALUD' }] },
        { title: 'TITLE', external_categories: [{ id: 'SUPER' }] },
      ],
    })
    expect(notice?.categoryHint).toBeUndefined()
  })

  it('toma external_categories de la orden del QR', () => {
    const payment = paymentWithOrderCategory(
      {
        id: 19,
        status: 'approved',
        transaction_amount: 15,
        description: 'DESCRIPTION',
        date_created: '2026-11-11T18:00:00.000Z',
        payment_type_id: 'account_money',
        additional_info: { items: [{ title: 'pildora' }] },
      },
      [{ title: 'pildora', external_categories: [{ id: 'salud' }] }],
    )
    expect(noticeFromTestPayment(payment)?.categoryHint).toBe('salud')
    expect(noticeFromTestPayment(payment)?.body).toBe('en pildora')
  })

  it('completa la categoría desde la orden si el pago no la trae', () => {
    const payment = paymentWithOrderCategory(
      {
        id: 18,
        status: 'approved',
        transaction_amount: 15,
        description: 'DESCRIPTION',
        date_created: '2026-11-11T18:00:00.000Z',
        payment_type_id: 'account_money',
        additional_info: { items: [{ title: 'TITLE', description: 'DESCRIPTION' }] },
      },
      [{ title: 'TITLE', category_id: 'SALUD' }],
    )
    expect(noticeFromTestPayment(payment)?.categoryHint).toBe('SALUD')
    expect(noticeFromTestPayment(payment)?.body).toBe('en TITLE')
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
