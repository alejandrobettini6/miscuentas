import { useState } from 'react'
import { TRIP_INDIVIDUAL_MERGE_ENABLED } from '@/constants/tripCategories'
import { TripMergeMode } from '@/types/enums'
import type { Settings, Trip, TripExpense } from '@/types/models'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatMoneyLabel } from '@/utils/formatters'
import { resolveAccountingCurrency } from '@/services/AccountingCurrency'
import { TripSummaryCalculator } from '@/services/TripSummaryCalculator'
import type { MergeDestination } from '@/services/TripMergeService'

interface CloseTripWizardProps {
  open: boolean
  trip: Trip
  expenses: TripExpense[]
  settings: Settings
  onClose: () => void
  onConfirmClose: (options?: {
    merge: boolean
    mergeMode?: TripMergeMode
    destination?: MergeDestination
  }) => Promise<void>
}

type Step = 'confirm' | 'merge_choice' | 'merge_mode' | 'destination'

export function CloseTripWizard({
  open,
  trip,
  expenses,
  settings,
  onClose,
  onConfirmClose,
}: CloseTripWizardProps) {
  const [step, setStep] = useState<Step>('confirm')
  const [mergeMode, setMergeMode] = useState<TripMergeMode>(TripMergeMode.AS_TRIP)
  const [destination, setDestination] = useState<MergeDestination>('by_date')
  const [busy, setBusy] = useState(false)

  const accountingCurrency = resolveAccountingCurrency(settings)
  const rates = { usdWhite: settings.usdWhite, usdCash: settings.usdCash }
  const summary = TripSummaryCalculator.calculate(
    expenses,
    trip.budgetLimit,
    accountingCurrency,
    rates,
  )

  const reset = () => {
    setStep('confirm')
    setMergeMode(TripMergeMode.AS_TRIP)
    setDestination('by_date')
    setBusy(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFinish = async (merge: boolean) => {
    setBusy(true)
    try {
      if (merge) {
        await onConfirmClose({ merge: true, mergeMode, destination })
      } else {
        await onConfirmClose({ merge: false })
      }
      reset()
    } catch {
      setBusy(false)
    }
  }

  const stepContent = () => {
    switch (step) {
      case 'confirm':
        return (
          <>
            <p className="mb-2 text-sm text-[var(--muted)]">
              ¿Cerrar <span className="font-semibold text-[var(--text)]">{trip.name}</span>?
            </p>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Total gastado:{' '}
              <span className="font-semibold text-[var(--text)]">
                {formatMoneyLabel(summary.totalSpent, accountingCurrency)}
              </span>
              {' · '}
              {expenses.length} movimiento{expenses.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={handleClose}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={() => setStep('merge_choice')}>
                Cerrar viaje
              </Button>
            </div>
          </>
        )

      case 'merge_choice':
        return (
          <>
            <p className="mb-4 text-sm text-[var(--muted)]">
              ¿Querés agregar los gastos del viaje a tus gastos mensuales?
            </p>
            <div className="flex flex-col gap-3">
              <Button
                className="w-full"
                onClick={() => {
                  if (expenses.length === 0) {
                    void handleFinish(false)
                    return
                  }
                  setStep('merge_mode')
                }}
              >
                Sí, fusionar gastos
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                disabled={busy}
                onClick={() => void handleFinish(false)}
              >
                No, solo cerrar
              </Button>
            </div>
          </>
        )

      case 'merge_mode':
        return (
          <>
            <p className="mb-3 text-sm text-[var(--muted)]">
              ¿Cómo agregar los gastos?
            </p>
            <div className="space-y-3">
              <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 active:bg-[var(--press)]">
                <input
                  type="radio"
                  name="mergeMode"
                  checked={mergeMode === TripMergeMode.AS_TRIP}
                  onChange={() => setMergeMode(TripMergeMode.AS_TRIP)}
                  className="h-5 w-5 accent-[var(--blue)]"
                />
                <div>
                  <span className="text-base">Como &quot;Viaje&quot;</span>
                  <p className="text-xs text-[var(--muted)]">
                    Todos los gastos en una categoría &quot;Viaje {trip.name}&quot;
                  </p>
                </div>
              </label>
              <label
                className={`flex min-h-10 items-center gap-3 rounded-xl px-3 ${
                  TRIP_INDIVIDUAL_MERGE_ENABLED
                    ? 'cursor-pointer active:bg-[var(--press)]'
                    : 'cursor-not-allowed opacity-50'
                }`}
                aria-disabled={!TRIP_INDIVIDUAL_MERGE_ENABLED}
              >
                <input
                  type="radio"
                  name="mergeMode"
                  checked={mergeMode === TripMergeMode.INDIVIDUAL}
                  disabled={!TRIP_INDIVIDUAL_MERGE_ENABLED}
                  onChange={() => {
                    if (TRIP_INDIVIDUAL_MERGE_ENABLED) {
                      setMergeMode(TripMergeMode.INDIVIDUAL)
                    }
                  }}
                  className="h-5 w-5 accent-[var(--blue)]"
                />
                <div>
                  <span className="text-base">Individual</span>
                  <p className="text-xs text-[var(--muted)]">
                    {TRIP_INDIVIDUAL_MERGE_ENABLED
                      ? 'Cada gasto se agrega a la categoría correspondiente'
                      : 'Próximamente. Cada gasto se agrega a la categoría correspondiente.'}
                  </p>
                </div>
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setStep('merge_choice')}>
                Atrás
              </Button>
              <Button className="flex-1" onClick={() => setStep('destination')}>
                Siguiente
              </Button>
            </div>
          </>
        )

      case 'destination':
        return (
          <>
            <p className="mb-3 text-sm text-[var(--muted)]">
              ¿Dónde registrar los gastos?
            </p>
            <div className="space-y-3">
              <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 active:bg-[var(--press)]">
                <input
                  type="radio"
                  name="destination"
                  checked={destination === 'by_date'}
                  onChange={() => setDestination('by_date')}
                  className="h-5 w-5 accent-[var(--blue)]"
                />
                <div>
                  <span className="text-base">En el mes que corresponde</span>
                  <p className="text-xs text-[var(--muted)]">
                    Cada gasto va al mes según su fecha
                  </p>
                </div>
              </label>
              <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 active:bg-[var(--press)]">
                <input
                  type="radio"
                  name="destination"
                  checked={destination === 'current_month'}
                  onChange={() => setDestination('current_month')}
                  className="h-5 w-5 accent-[var(--blue)]"
                />
                <div>
                  <span className="text-base">Todo en el mes actual</span>
                  <p className="text-xs text-[var(--muted)]">
                    Todos los gastos van al período activo
                  </p>
                </div>
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setStep('merge_mode')}>
                Atrás
              </Button>
              <Button className="flex-1" disabled={busy} onClick={() => void handleFinish(true)}>
                Confirmar
              </Button>
            </div>
          </>
        )
    }
  }

  const titles: Record<Step, string> = {
    confirm: 'Cerrar viaje',
    merge_choice: 'Fusionar gastos',
    merge_mode: 'Modo de fusión',
    destination: 'Destino de gastos',
  }

  return (
    <Modal open={open} title={titles[step]} onClose={handleClose}>
      {stepContent()}
    </Modal>
  )
}
