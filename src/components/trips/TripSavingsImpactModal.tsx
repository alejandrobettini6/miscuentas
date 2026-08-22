import { Currency } from '@/types/enums'
import type { TripSavingsImpactPreview } from '@/services/SavingsReconciliationService'
import { formatMoneyLabel } from '@/utils/formatters'
import { savingsCurrencySubtitle } from '@/utils/savingsFormat'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface TripSavingsImpactModalProps {
  open: boolean
  preview: TripSavingsImpactPreview
  accountingCurrency: Currency
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function formatDelta(amount: number, currency: Currency): string {
  const sign = amount >= 0 ? '+' : '−'
  return `${sign}${formatMoneyLabel(Math.abs(amount), currency)}`
}

export function TripSavingsImpactModal({
  open,
  preview,
  accountingCurrency,
  busy = false,
  onConfirm,
  onCancel,
}: TripSavingsImpactModalProps) {
  const hasNonAdjustable = preview.months.some((month) => !month.canAdjust)

  return (
    <Modal open={open} title="Impacto en meses pasados" onClose={onCancel}>
      <p className="mb-4 text-sm text-[var(--muted)]">
        Estás cerrando un viaje que registra gastos en mes(es) ya cerrado(s).
        Esto modifica el ahorro registrado de esos meses.
      </p>
      <p className="mb-4 text-xs text-[var(--muted)]">
        {savingsCurrencySubtitle(accountingCurrency)}
      </p>

      <div className="mb-4 max-h-72 space-y-4 overflow-y-auto">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-[var(--text)]">Meses afectados</h3>
          <div className="space-y-2">
            {preview.months.map((month) => (
              <div
                key={month.periodId}
                className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-sm"
              >
                <p className="font-semibold text-[var(--text)]">{month.periodLabel}</p>
                <div className="mt-2 space-y-1 tabular-nums text-[var(--muted)]">
                  <div className="flex justify-between gap-3">
                    <span>Gasto del viaje</span>
                    <span className="font-medium text-[var(--text)]">
                      {formatMoneyLabel(month.tripExpenseTotal, accountingCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Ahorro del mes</span>
                    <span className="font-medium text-[var(--text)]">
                      {formatMoneyLabel(month.previousSavings, accountingCurrency)}
                      {' → '}
                      {formatMoneyLabel(month.newSavings, accountingCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Ajuste</span>
                    <span className="font-medium text-[var(--text)]">
                      {formatDelta(month.delta, accountingCurrency)}
                    </span>
                  </div>
                  {!month.canAdjust && (
                    <p className="pt-1 text-xs text-[var(--warn-text)]">
                      Sin cajita registrada — no se puede ajustar automáticamente
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {preview.locations.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-[var(--text)]">Cajitas</h3>
            <div className="space-y-2">
              {preview.locations.map((location) => (
                <div
                  key={location.name}
                  className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-sm"
                >
                  <p className="font-semibold text-[var(--text)]">{location.name}</p>
                  <div className="mt-2 space-y-1 tabular-nums text-[var(--muted)]">
                    <div className="flex justify-between gap-3">
                      <span>Actual</span>
                      <span className="font-medium text-[var(--text)]">
                        {formatMoneyLabel(location.current, accountingCurrency)}
                      </span>
                    </div>
                    {location.impacts.map((impact) => (
                      <div key={impact.periodLabel} className="flex justify-between gap-3">
                        <span>{impact.periodLabel}</span>
                        <span className="font-medium text-[var(--text)]">
                          {formatDelta(impact.delta, accountingCurrency)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between gap-3 border-t border-[var(--border)] pt-2">
                      <span className="font-medium text-[var(--text)]">Final</span>
                      <span className="font-semibold text-[var(--green)]">
                        {formatMoneyLabel(location.final, accountingCurrency)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {hasNonAdjustable && (
        <p className="mb-4 text-xs text-[var(--warn-text)]">
          Algunos meses no tienen ahorro registrado en una cajita; solo se ajustarán
          los meses con registro completo.
        </p>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="flex-1" disabled={busy} onClick={onConfirm}>
          Confirmar y cerrar viaje
        </Button>
      </div>
    </Modal>
  )
}
