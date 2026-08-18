import { ChevronDown, Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { TripStatus } from '@/types/enums'
import type { Trip } from '@/types/models'
import { MAX_OPEN_TRIPS } from '@/constants/tripCategories'
import { useBackButtonClose } from '@/hooks/useBackButtonClose'

interface TripSelectorProps {
  trips: Trip[]
  selectedTripId: string | null
  onSelect: (tripId: string) => void
  onNewTrip: () => void
  disabled?: boolean
}

export function TripSelector({
  trips,
  selectedTripId,
  onSelect,
  onNewTrip,
  disabled,
}: TripSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useBackButtonClose(open, () => setOpen(false))

  const activeTrips = trips.filter((t) => t.status === TripStatus.ACTIVE)
  const selected = activeTrips.find((t) => t.id === selectedTripId)
  const canCreate = activeTrips.length < MAX_OPEN_TRIPS

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-xl bg-[var(--surface-2)] px-4 py-2 text-left text-base font-medium disabled:opacity-50"
        onClick={() => setOpen(!open)}
        aria-label="Seleccionar viaje"
      >
        <span className="truncate">{selected?.name ?? 'Seleccionar viaje'}</span>
        <ChevronDown size={18} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
            {activeTrips.map((trip) => (
              <button
                key={trip.id}
                type="button"
                className={`flex min-h-10 w-full items-center px-4 text-left text-sm ${
                  trip.id === selectedTripId
                    ? 'bg-[var(--blue)]/10 font-semibold text-[var(--blue)]'
                    : 'text-[var(--text)]'
                }`}
                onClick={() => {
                  onSelect(trip.id)
                  setOpen(false)
                }}
              >
                {trip.name}
              </button>
            ))}
            {canCreate && (
              <button
                type="button"
                className="flex min-h-10 w-full items-center gap-2 border-t border-[var(--border)] px-4 text-left text-sm text-[var(--blue)]"
                onClick={() => {
                  setOpen(false)
                  onNewTrip()
                }}
              >
                <Plus size={16} />
                Nuevo viaje
              </button>
            )}
            {!canCreate && activeTrips.length >= MAX_OPEN_TRIPS && (
              <p className="border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)]">
                Máximo {MAX_OPEN_TRIPS} viajes abiertos
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
