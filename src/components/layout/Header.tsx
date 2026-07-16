import { ChevronLeft, ChevronRight, Menu } from 'lucide-react'
import type { Period } from '@/types/models'
import { PeriodStatus } from '@/types/enums'

interface HeaderProps {
  onOpenMenu: () => void
  periods: Period[]
  selectedPeriodId: string | null
  onSelectPeriod: (periodId: string) => void
  readOnly?: boolean
}

export function Header({
  onOpenMenu,
  periods,
  selectedPeriodId,
  onSelectPeriod,
  readOnly = false,
}: HeaderProps) {
  const sorted = [...periods].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
  const index = sorted.findIndex((p) => p.id === selectedPeriodId)
  const current = index >= 0 ? sorted[index] : null
  const canPrev = index > 0
  const canNext = index >= 0 && index < sorted.length - 1

  return (
    <header className="flex items-center justify-between py-3">
      <button
        type="button"
        className="flex min-h-11 min-w-11 items-center justify-center rounded-xl"
        aria-label="Abrir menú"
        onClick={onOpenMenu}
      >
        <Menu size={26} />
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
        <button
          type="button"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-xl disabled:opacity-30"
          aria-label="Mes anterior"
          disabled={!canPrev}
          onClick={() => {
            const prev = sorted[index - 1]
            if (prev) onSelectPeriod(prev.id)
          }}
        >
          <ChevronLeft size={22} />
        </button>

        <div className="min-w-0 text-center">
          <h1 className="truncate text-lg font-semibold">
            {current?.label ?? 'Sin período'}
          </h1>
          {readOnly || current?.status === PeriodStatus.CLOSED ? (
            <p className="text-xs font-medium text-[var(--muted)]">Solo lectura</p>
          ) : null}
        </div>

        <button
          type="button"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-xl disabled:opacity-30"
          aria-label="Mes siguiente"
          disabled={!canNext}
          onClick={() => {
            const next = sorted[index + 1]
            if (next) onSelectPeriod(next.id)
          }}
        >
          <ChevronRight size={22} />
        </button>
      </div>

      <div className="min-w-11" aria-hidden="true" />
    </header>
  )
}
