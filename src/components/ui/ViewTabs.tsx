import { ViewMode } from '@/types/enums'

const VIEW_LABELS: Record<ViewMode, string> = {
  [ViewMode.EXPENSES]: 'Gastos',
  [ViewMode.INCOME]: 'Ingresos',
}

interface ViewTabsProps {
  value: ViewMode
  onChange: (value: ViewMode) => void
  disabled?: boolean
}

export function ViewTabs({ value, onChange, disabled }: ViewTabsProps) {
  const views = [ViewMode.EXPENSES, ViewMode.INCOME]

  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-2xl bg-[var(--fill)] p-1"
      role="tablist"
      aria-label="Vista"
    >
      {views.map((view) => {
        const active = value === view
        return (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={VIEW_LABELS[view]}
            disabled={disabled}
            className={`min-h-10 rounded-xl text-sm font-semibold transition ${
              active
                ? 'bg-[var(--segment-active)] text-[var(--text)] shadow-sm'
                : 'text-[var(--muted)]'
            }`}
            onClick={() => onChange(view)}
          >
            {VIEW_LABELS[view]}
          </button>
        )
      })}
    </div>
  )
}
