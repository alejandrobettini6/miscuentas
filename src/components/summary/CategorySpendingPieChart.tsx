import { memo } from 'react'
import { getCategoryEmoji } from '@/constants/categories'
import type { CategoryChartSlice } from '@/services/CategoryChartData'
import { REST_SLICE_KEY } from '@/services/CategoryChartData'
import { formatPercent } from '@/utils/formatters'

interface CategorySpendingPieChartProps {
  slices: CategoryChartSlice[]
  size: 'compact' | 'large'
}

const SIZE = {
  compact: { diameter: 80, stroke: 0 },
  large: { diameter: 152, stroke: 0 },
} as const

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ')
}

function buildAriaLabel(slices: CategoryChartSlice[]): string {
  return slices
    .map((s) => `${s.label} ${formatPercent(s.percent)}`)
    .join(', ')
}

function PieSvg({ slices, diameter }: { slices: CategoryChartSlice[]; diameter: number }) {
  const cx = diameter / 2
  const cy = diameter / 2
  const r = diameter / 2 - 1
  let cursor = 0

  return (
    <svg
      width={diameter}
      height={diameter}
      viewBox={`0 0 ${diameter} ${diameter}`}
      className="shrink-0"
      aria-hidden
    >
      {slices.map((slice) => {
        const sweep = (slice.percent / 100) * 360
        const start = cursor
        const end = cursor + sweep
        cursor = end
        if (slice.percent >= 99.95) {
          return (
            <circle
              key={slice.key}
              cx={cx}
              cy={cy}
              r={r}
              fill={slice.color}
            />
          )
        }
        return (
          <path
            key={slice.key}
            d={describeArc(cx, cy, r, start, end)}
            fill={slice.color}
          />
        )
      })}
    </svg>
  )
}

function LegendItem({ slice }: { slice: CategoryChartSlice }) {
  const emoji =
    slice.key === REST_SLICE_KEY
      ? '⋯'
      : getCategoryEmoji({
          category: slice.category,
          isOtrosGrande: slice.isOtrosGrande,
          label: slice.label,
          description: slice.description,
        })

  return (
    <li className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--muted)]">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: slice.color }}
        aria-hidden
      />
      <span className="shrink-0" aria-hidden>
        {emoji}
      </span>
      <span className="min-w-0 truncate text-[var(--text)]">{slice.label}</span>
      <span className="ml-auto shrink-0 tabular-nums font-medium text-[var(--text)]">
        {formatPercent(slice.percent)}
      </span>
    </li>
  )
}

function CategorySpendingPieChartComponent({
  slices,
  size,
}: CategorySpendingPieChartProps) {
  const { diameter } = SIZE[size]

  if (slices.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 ${
          size === 'compact' ? 'w-[80px]' : 'w-full'
        }`}
        role="img"
        aria-label="Sin gastos para mostrar en el gráfico"
      >
        <svg width={diameter} height={diameter} aria-hidden>
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={diameter / 2 - 2}
            fill="none"
            stroke="var(--border)"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        </svg>
        {size === 'large' && (
          <p className="text-center text-xs text-[var(--muted)]">Sin gastos para mostrar</p>
        )}
      </div>
    )
  }

  const ariaLabel = `Distribución por categoría: ${buildAriaLabel(slices)}`

  if (size === 'compact') {
    return (
      <div
        className="flex flex-col items-end gap-1.5"
        role="img"
        aria-label={ariaLabel}
      >
        <PieSvg slices={slices} diameter={diameter} />
        <ul className="w-full max-w-[140px] space-y-0.5">
          {slices.map((slice) => (
            <LegendItem key={slice.key} slice={slice} />
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div role="img" aria-label={ariaLabel} className="mt-4 border-t border-[var(--border)] pt-4">
      <p className="mb-3 text-sm text-[var(--muted)]">Por categoría (mes completo)</p>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
        <PieSvg slices={slices} diameter={diameter} />
        <ul className="grid w-full min-w-0 flex-1 grid-cols-1 gap-1.5 sm:grid-cols-2">
          {slices.map((slice) => (
            <LegendItem key={slice.key} slice={slice} />
          ))}
        </ul>
      </div>
    </div>
  )
}

export const CategorySpendingPieChart = memo(CategorySpendingPieChartComponent)
