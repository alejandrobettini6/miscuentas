import { useState } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSettingsContext } from '@/contexts/SettingsContext'
import { useAmountsVisibility } from '@/hooks/useAmountsVisibility'
import { useBackButtonClose } from '@/hooks/useBackButtonClose'
import { useSavings } from '@/hooks/useSavings'
import { resolveAccountingCurrency } from '@/services/AccountingCurrency'
import { savingsCurrencySubtitle } from '@/utils/savingsFormat'
import { getErrorMessage } from '@/utils/errors'
import { SavingsLocationList } from './SavingsLocationList'
import { SavingsTotalCard } from './SavingsTotalCard'

interface SavingsPanelProps {
  open: boolean
  onClose: () => void
}

export function SavingsPanel({ open, onClose }: SavingsPanelProps) {
  const { settings } = useSettingsContext()
  const {
    summary,
    addLocation,
    renameLocation,
    removeLocation,
    setLocationBalance,
  } = useSavings()
  const [amountsHidden, toggleAmountsHidden] = useAmountsVisibility()
  const [busy, setBusy] = useState(false)

  useBackButtonClose(open, onClose)

  if (!open) return null

  const accountingCurrency = settings
    ? resolveAccountingCurrency(settings)
    : undefined

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo guardar'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[55] bg-[var(--overlay)]" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-[55] flex w-[min(100%,360px)] flex-col bg-[var(--surface)] shadow-xl">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Ahorros</h2>
              {accountingCurrency && (
                <p className="text-xs text-[var(--muted)]">
                  {savingsCurrencySubtitle(accountingCurrency)}
                </p>
              )}
            </div>
            <button
            type="button"
            className="flex min-h-11 min-w-11 items-center justify-center"
            aria-label="Cerrar ahorros"
            onClick={onClose}
          >
            <X size={22} />
          </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!settings || !summary ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">Cargando…</p>
          ) : (
            <div className="space-y-4">
              <SavingsTotalCard
                total={summary.totalSaved}
                accountingCurrency={accountingCurrency}
                amountsHidden={amountsHidden}
                onToggleAmounts={toggleAmountsHidden}
              />
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Cajitas
                </h3>
                <SavingsLocationList
                  rows={summary.byLocation}
                  accountingCurrency={accountingCurrency!}
                  amountsHidden={amountsHidden}
                  busy={busy}
                  onAdd={(name) => run(() => addLocation(name))}
                  onEditBalance={(name, amount) =>
                    run(() => setLocationBalance(name, amount))
                  }
                  onRename={(oldName, newName) =>
                    run(() => renameLocation(oldName, newName))
                  }
                  onRemove={(name) => run(() => removeLocation(name))}
                />
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
