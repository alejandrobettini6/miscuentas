import { describe, expect, it } from 'vitest'
import { Category } from '@/types/enums'
import {
  buildCategoryChartSlices,
  CATEGORY_CHART_TOP_N,
  REST_SLICE_KEY,
} from './CategoryChartData'

function row(
  label: string,
  amount: number,
  partial?: Partial<{
    category: Category
    isOtrosGrande: boolean
  }>,
) {
  return {
    label,
    category: partial?.category ?? Category.SUPER,
    isOtrosGrande: partial?.isOtrosGrande ?? false,
    amount,
  }
}

describe('buildCategoryChartSlices', () => {
  it('devuelve vacío si no hay montos positivos', () => {
    expect(buildCategoryChartSlices([row('Super', 0), row('Delivery', -5)])).toEqual(
      [],
    )
  })

  it('calcula porcentajes para una sola categoría', () => {
    const slices = buildCategoryChartSlices([row('Super', 100)])
    expect(slices).toHaveLength(1)
    expect(slices[0]?.percent).toBe(100)
    expect(slices[0]?.label).toBe('Super')
  })

  it('agrupa el resto después del top N', () => {
    const rows = Array.from({ length: CATEGORY_CHART_TOP_N + 3 }, (_, i) =>
      row(`Cat${i}`, 100 - i),
    )
    const slices = buildCategoryChartSlices(rows)
    expect(slices).toHaveLength(CATEGORY_CHART_TOP_N + 1)
    expect(slices[slices.length - 1]?.key).toBe(REST_SLICE_KEY)
    expect(slices[slices.length - 1]?.label).toBe('Resto')
    const sumPercent = slices.reduce((acc, s) => acc + s.percent, 0)
    expect(sumPercent).toBeGreaterThanOrEqual(99)
    expect(sumPercent).toBeLessThanOrEqual(100.1)
  })

  it('no agrega Resto si hay exactamente top N categorías', () => {
    const rows = Array.from({ length: CATEGORY_CHART_TOP_N }, (_, i) =>
      row(`Cat${i}`, 50 + i),
    )
    const slices = buildCategoryChartSlices(rows)
    expect(slices).toHaveLength(CATEGORY_CHART_TOP_N)
    expect(slices.some((s) => s.key === REST_SLICE_KEY)).toBe(false)
  })

  it('ordena por monto descendente antes de cortar', () => {
    const slices = buildCategoryChartSlices([
      row('A', 10),
      row('B', 50),
      row('C', 30),
    ])
    expect(slices.map((s) => s.label)).toEqual(['B', 'C', 'A'])
  })

  it('asigna color distinto a categoría personalizada', () => {
    const slices = buildCategoryChartSlices([
      {
        label: 'Guitarra',
        category: Category.OTHER,
        isOtrosGrande: true,
        amount: 20,
      },
    ])
    expect(slices[0]?.color).toMatch(/^#/)
  })
})
