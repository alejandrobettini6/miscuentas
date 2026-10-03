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
  compact: { diameter: 96, stroke: 0 },
  large: { diameter: 172, stroke: 0 },
} as const

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

/** Radio interior del donut (proporción del exterior). */
const DONUT_INNER_RATIO = 0.58

/** Separación angular entre segmentos (grados). */
const SEGMENT_GAP_DEG = 1.4

function describeDonutSegment(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
): string {
  const startOuter = polarToCartesian(cx, cy, rOuter, endAngle)
  const endOuter = polarToCartesian(cx, cy, rOuter, startAngle)
  const startInner = polarToCartesian(cx, cy, rInner, startAngle)
  const endInner = polarToCartesian(cx, cy, rInner, endAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ')
}

function describeFullDonutRing(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
): string {
  const rightOuter = polarToCartesian(cx, cy, rOuter, 0)
  const leftOuter = polarToCartesian(cx, cy, rOuter, 180)
  const rightInner = polarToCartesian(cx, cy, rInner, 0)
  const leftInner = polarToCartesian(cx, cy, rInner, 180)
  return [
    `M ${rightOuter.x} ${rightOuter.y}`,
    `A ${rOuter} ${rOuter} 0 1 1 ${leftOuter.x} ${leftOuter.y}`,
    `A ${rOuter} ${rOuter} 0 1 1 ${rightOuter.x} ${rightOuter.y}`,
    `M ${rightInner.x} ${rightInner.y}`,
    `A ${rInner} ${rInner} 0 1 0 ${leftInner.x} ${leftInner.y}`,
    `A ${rInner} ${rInner} 0 1 0 ${rightInner.x} ${rightInner.y}`,
    'Z',
  ].join(' ')
}

function buildAriaLabel(slices: CategoryChartSlice[]): string {
  return slices
    .map((s) => `${s.label} ${formatPercent(s.percent)}`)
    .join(', ')
}

const DONUT_SLICE_STROKE = 'var(--surface)'

function donutRadii(diameter: number) {
  const rOuter = diameter / 2 - 1
  const rInner = rOuter * DONUT_INNER_RATIO
  return { rOuter, rInner }
}

function EmptyDonutSvg({ diameter }: { diameter: number }) {
  const cx = diameter / 2
  const cy = diameter / 2
  const { rOuter, rInner } = donutRadii(diameter)
  const rMid = (rOuter + rInner) / 2
  const ringWidth = rOuter - rInner
  return (
    <svg width={diameter} height={diameter} aria-hidden>
      <circle
        cx={cx}
        cy={cy}
        r={rMid}
        fill="none"
        stroke="var(--border)"
        strokeWidth={ringWidth}
        strokeDasharray="4 4"
      />
    </svg>
  )
}

function PieSvg({ slices, diameter }: { slices: CategoryChartSlice[]; diameter: number }) {
  const cx = diameter / 2
  const cy = diameter / 2
  const { rOuter, rInner } = donutRadii(diameter)
  const strokeWidth = diameter >= 140 ? 2 : 1.5
  const gap = slices.length > 1 ? SEGMENT_GAP_DEG : 0
  const halfGap = gap / 2
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
        const start = cursor + halfGap
        const end = cursor + sweep - halfGap
        cursor += sweep

        if (slice.percent >= 99.95) {
          return (
            <path
              key={slice.key}
              d={describeFullDonutRing(cx, cy, rOuter, rInner)}
              fill={slice.color}
              fillRule="evenodd"
            />
          )
        }

        if (end - start < 0.5) return null

        return (
          <path
            key={slice.key}
            d={describeDonutSegment(cx, cy, rOuter, rInner, start, end)}
            fill={slice.color}
            stroke={DONUT_SLICE_STROKE}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
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
    <li className="flex min-w-0 max-w-full items-center gap-1 text-[10px] leading-tight tracking-tight sm:text-[11px]">
      <span
        className="size-1.5 shrink-0 rounded-full ring-1 ring-[var(--border)]/60"
        style={{ backgroundColor: slice.color }}
        aria-hidden
      />
      <span className="shrink-0 text-[10px] leading-none opacity-90" aria-hidden>
        {emoji}
      </span>
      <span className="min-w-0 truncate font-normal text-[var(--text)]">{slice.label}</span>
      <span className="ml-auto shrink-0 tabular-nums font-medium text-[var(--muted)]">
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
          size === 'compact' ? 'w-full' : 'w-full'
        }`}
        role="img"
        aria-label="Sin gastos para mostrar en el gráfico"
      >
        <EmptyDonutSvg diameter={diameter} />
        {size === 'large' && (
          <p className="text-center text-[11px] text-[var(--muted)]">Sin gastos para mostrar</p>
        )}
      </div>
    )
  }

  const ariaLabel = `Distribución por categoría: ${buildAriaLabel(slices)}`

  if (size === 'compact') {
    return (
      <div
        className="flex w-full min-w-0 flex-col items-center gap-2 sm:items-end sm:gap-1"
        role="img"
        aria-label={ariaLabel}
      >
        <PieSvg slices={slices} diameter={diameter} />
        <ul className="grid w-full min-w-0 grid-cols-2 gap-x-3 gap-y-0.5 sm:grid-cols-1 sm:max-w-[176px]">
          {slices.map((slice) => (
            <LegendItem key={slice.key} slice={slice} />
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="mt-3 border-t border-[var(--border)] pt-3 sm:mt-4 sm:pt-3.5"
    >
      <p className="mb-2 text-[11px] font-medium tracking-wide text-[var(--muted)]">
        Por categoría (mes completo)
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-5">
        <PieSvg slices={slices} diameter={diameter} />
        <ul className="grid w-full min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-0.5 sm:gap-1">
          {slices.map((slice) => (
            <LegendItem key={slice.key} slice={slice} />
          ))}
        </ul>
      </div>
    </div>
  )
}

export const CategorySpendingPieChart = memo(CategorySpendingPieChartComponent)
