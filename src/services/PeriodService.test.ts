import { describe, expect, it } from 'vitest'
import { PeriodStatus } from '@/types/enums'
import { PeriodService } from './PeriodService'

describe('PeriodService', () => {
  it('crea período con etiqueta legible', () => {
    const period = PeriodService.buildPeriod('u', '2026-07')
    expect(period.label).toBe('Julio 2026')
    expect(period.status).toBe(PeriodStatus.ACTIVE)
    expect(period.closedAt).toBeNull()
  })

  it('cierra y abre el siguiente mes', () => {
    const active = PeriodService.buildPeriod('u', '2026-07')
    const closed = PeriodService.closePeriod(active)
    expect(closed.status).toBe(PeriodStatus.CLOSED)
    expect(closed.closedAt).toBeTruthy()

    const next = PeriodService.openNextPeriod('u', closed, 1500)
    expect(next.yearMonth).toBe('2026-08')
    expect(next.status).toBe(PeriodStatus.ACTIVE)
    expect(next.monthlyLimitSnapshot).toBe(1500)
  })
})
