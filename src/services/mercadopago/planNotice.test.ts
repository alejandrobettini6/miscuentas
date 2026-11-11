import { describe, expect, it } from 'vitest'
import { AccountType, Category } from '@/types/enums'
import { FIXED_CATEGORIES } from '@/constants/categories'
import { planMercadoPagoNotice } from './planNotice'

const base = {
  noticeId: 'n1',
  externalId: 'e1',
  postedAt: '2026-11-11T18:00:00.000Z',
  enabledAccounts: [AccountType.WHITE, AccountType.CASH],
  enabledFixed: FIXED_CATEGORIES,
  customCategories: [] as string[],
}

describe('planMercadoPagoNotice', () => {
  it('registra solo un pago con categoría clara, en Blanco', () => {
    const plan = planMercadoPagoNotice({
      ...base,
      title: 'Pagaste $1.200',
      body: 'en Farmacity',
    })
    expect(plan.type).toBe('auto')
    if (plan.type !== 'auto') return
    expect(plan.expense.accountType).toBe(AccountType.WHITE)
    expect(plan.expense.category).toBe(Category.SALUD)
    expect(plan.expense.detail).toBe('Farmacity')
  })

  it('usa Negro si Blanco no está habilitado', () => {
    const plan = planMercadoPagoNotice({
      ...base,
      enabledAccounts: [AccountType.CASH],
      title: 'Pagaste $1.200',
      body: 'en Farmacity',
    })
    expect(plan.type).toBe('auto')
    if (plan.type !== 'auto') return
    expect(plan.expense.accountType).toBe(AccountType.CASH)
  })

  it('pide categoría cuando el pago no se reconoce', () => {
    const plan = planMercadoPagoNotice({
      ...base,
      title: 'Pagaste $900',
      body: 'en Kiosco Don Pedro',
    })
    expect(plan.type).toBe('review')
  })

  it('siempre pide categoría en una transferencia', () => {
    const plan = planMercadoPagoNotice({
      ...base,
      title: 'Transferiste $500',
      body: 'a Farmacity',
    })
    expect(plan.type).toBe('review')
    if (plan.type !== 'review') return
    expect(plan.review.kind).toBe('transfer')
    expect(plan.review.category).toBe(Category.SALUD)
  })
})
