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

  it('findOrBuildForYearMonth reutiliza un período existente en vez de duplicarlo', () => {
    const existing = PeriodService.buildPeriod('u', '2026-08', {
      status: PeriodStatus.ACTIVE,
    })
    const result = PeriodService.findOrBuildForYearMonth(
      [existing],
      'u',
      '2026-08',
      { status: PeriodStatus.ACTIVE, monthlyLimitSnapshot: 1500 },
    )
    expect(result.id).toBe(existing.id)
  })

  it('findOrBuildForYearMonth crea uno nuevo si no existe para ese mes', () => {
    const result = PeriodService.findOrBuildForYearMonth([], 'u', '2026-09', {
      status: PeriodStatus.ACTIVE,
      monthlyLimitSnapshot: 1200,
    })
    expect(result.yearMonth).toBe('2026-09')
    expect(result.status).toBe(PeriodStatus.ACTIVE)
    expect(result.monthlyLimitSnapshot).toBe(1200)
  })

  it('planNextPeriod crea el mes siguiente al último existente sin cerrar el actual', () => {
    const active = PeriodService.buildPeriod('u', '2026-07', {
      status: PeriodStatus.ACTIVE,
    })
    const next = PeriodService.planNextPeriod([active], 'u', 1500)
    expect(next.yearMonth).toBe('2026-08')
    expect(next.status).toBe(PeriodStatus.ACTIVE)
    // El período original sigue existiendo tal cual (no se cierra acá).
    expect(active.status).toBe(PeriodStatus.ACTIVE)
  })

  it('planNextPeriod encadena a partir del último mes ya adelantado', () => {
    const active = PeriodService.buildPeriod('u', '2026-07', {
      status: PeriodStatus.ACTIVE,
    })
    const advanced = PeriodService.buildPeriod('u', '2026-08', {
      status: PeriodStatus.ACTIVE,
    })
    const next = PeriodService.planNextPeriod([active, advanced], 'u', 1500)
    expect(next.yearMonth).toBe('2026-09')
  })
})
