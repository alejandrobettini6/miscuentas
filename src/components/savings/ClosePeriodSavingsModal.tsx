import { Currency } from '@/types/enums'
import { formatMoneyLabel } from '@/utils/formatters'
import { savingsCurrencySubtitle } from '@/utils/savingsFormat'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface ClosePeriodSavingsModalProps {
  open: boolean
  amount: number
  periodLabel: string
  locations: string[]
  accountingCurrency: Currency
  mode?: 'beforeClose' | 'catchUp'
  busy?: boolean
  onConfirm: (locationName: string) => void
  onCancel: () => void
}

export function ClosePeriodSavingsModal({
  open,
  amount,
  periodLabel,
  locations,
  accountingCurrency,
  mode = 'beforeClose',
  busy = false,
  onConfirm,
  onCancel,
}: ClosePeriodSavingsModalProps) {
  const isCatchUp = mode === 'catchUp'
  const subtitle =
    amount > 0
      ? `${savingsCurrencySubtitle(accountingCurrency)} · ¿A qué cajita lo sumamos?`
      : amount < 0
        ? `${savingsCurrencySubtitle(accountingCurrency)} · ¿De qué cajita descontamos el déficit?`
        : `${savingsCurrencySubtitle(accountingCurrency)} · ¿En qué cajita registramos este mes?`

  return (
    <Modal open={open} title="Ahorro del mes" onClose={onCancel}>
      <p className="mb-1 text-[var(--muted)]">
        {periodLabel}:{' '}
        {amount >= 0 ? 'ahorro de ' : 'balance de '}
        <span className="font-semibold text-[var(--text)]">
          {formatMoneyLabel(amount, accountingCurrency)}
        </span>
      </p>
      <p className="mb-4 text-sm text-[var(--muted)]">{subtitle}</p>

      {locations.length === 0 ? (
        <p className="mb-4 text-sm text-[var(--red)]">
          {isCatchUp
            ? 'Creá al menos una cajita en Ahorros (menú) para registrar meses anteriores.'
            : 'Agregá al menos una cajita en Ahorros antes de cerrar el mes.'}
        </p>
      ) : (
        <div className="mb-4 flex max-h-48 flex-col gap-2 overflow-y-auto">
          {locations.map((name) => (
            <Button
              key={name}
              variant="secondary"
              className="w-full justify-start"
              disabled={busy}
              onClick={() => onConfirm(name)}
            >
              {name}
            </Button>
          ))}
        </div>
      )}

      <Button variant="secondary" className="w-full" disabled={busy} onClick={onCancel}>
        {isCatchUp ? 'Omitir' : 'Cancelar'}
      </Button>
    </Modal>
  )
}
