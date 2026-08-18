import { useMemo } from 'react'
import { RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSettingsContext } from '@/contexts/SettingsContext'
import { useExpenses } from '@/hooks/useExpenses'
import { useTrips } from '@/hooks/useTrips'
import { TripStatus } from '@/types/enums'
import { MAX_OPEN_TRIPS } from '@/constants/tripCategories'
import { customCategoriesToRemoveAfterRevert } from '@/services/MergedExpenseGuard'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatDetailTimestamp } from '@/utils/date'
import { getErrorMessage } from '@/utils/errors'

interface TripHistoryPanelProps {
  open: boolean
  onClose: () => void
  onTripReopened?: () => void | Promise<void>
}

export function TripHistoryPanel({ open, onClose, onTripReopened }: TripHistoryPanelProps) {
  const { trips, reopenTrip, isMutating } = useTrips()
  const { expenses, removeExpense, refresh: refreshExpenses } = useExpenses()
  const { settings, updateSettings } = useSettingsContext()

  const closedTrips = useMemo(
    () =>
      trips
        .filter((t) => t.status === TripStatus.CLOSED)
        .sort(
          (a, b) =>
            new Date(b.closedAt ?? b.createdAt).getTime() -
            new Date(a.closedAt ?? a.createdAt).getTime(),
        ),
    [trips],
  )

  const activeCount = trips.filter((t) => t.status === TripStatus.ACTIVE).length

  const canReopen = (reopenDeadline: string | null) => {
    if (!reopenDeadline) return false
    return new Date(reopenDeadline).getTime() > Date.now()
  }

  const handleReopen = async (tripId: string) => {
    if (activeCount >= MAX_OPEN_TRIPS) {
      toast.error(`Máximo ${MAX_OPEN_TRIPS} viajes abiertos. Cerrá uno primero.`)
      return
    }

    const trip = trips.find((t) => t.id === tripId)
    if (!trip) return

    try {
      const mergedIds = trip.mergedExpenseIds ?? []

      if (mergedIds.length > 0) {
        for (const expenseId of mergedIds) {
          await removeExpense(expenseId)
        }

        if (settings) {
          const toRemove = customCategoriesToRemoveAfterRevert(trip, expenses, mergedIds)
          if (toRemove.length > 0) {
            const removeLower = new Set(toRemove.map((c) => c.toLowerCase()))
            await updateSettings({
              customCategories: settings.customCategories.filter(
                (c) => !removeLower.has(c.toLowerCase()),
              ),
            })
          }
        }

        await refreshExpenses()
      }

      await reopenTrip(tripId)
      await onTripReopened?.()
      toast.success('Viaje reabierto')
      onClose()
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo reabrir'))
    }
  }

  return (
    <Modal open={open} title="Historial de viajes" onClose={onClose}>
      {closedTrips.length === 0 ? (
        <p className="py-4 text-center text-sm text-[var(--muted)]">
          No hay viajes cerrados
        </p>
      ) : (
        <div className="max-h-80 space-y-3 overflow-y-auto">
          {closedTrips.map((trip) => {
            const reopenable = canReopen(trip.reopenDeadline)
            const wasMerged = Boolean(trip.mergedAt)

            return (
              <div
                key={trip.id}
                className="rounded-xl bg-[var(--surface-2)] px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{trip.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      Cerrado {trip.closedAt ? formatDetailTimestamp(trip.closedAt) : ''}
                    </p>
                    {wasMerged && (
                      <p className="text-xs text-[var(--blue)]">
                        Fusionado ({trip.mergeMode === 'AS_TRIP' ? 'como viaje' : 'individual'})
                      </p>
                    )}
                  </div>
                  {reopenable && (
                    <Button
                      variant="secondary"
                      disabled={isMutating}
                      onClick={() => void handleReopen(trip.id)}
                      aria-label={`Reabrir ${trip.name}`}
                    >
                      <RotateCcw size={16} />
                      <span className="ml-1">Reabrir</span>
                    </Button>
                  )}
                  {!reopenable && (
                    <span className="text-xs text-[var(--muted)]">Expirado</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
