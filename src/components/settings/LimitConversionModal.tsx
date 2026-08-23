import { useEffect, useState } from 'react'
import { AccountType, Currency } from '@/types/enums'
import { convertMonthlyLimit } from '@/services/AccountingCurrency'
import {
  formatExchangeRateLabel,
  formatMoneyLabel,
} from '@/utils/formatters'
import {
  isValidMonthlyLimit,
  parseAmountInput,
} from '@/validators/amount'
import { AmountInput } from '@/components/ui/AmountInput'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

type RateOption = 'white' | 'cash' | 'manualLimit'

interface LimitConversionModalProps {
  open: boolean
  currentLimit: number
  fromCurrency: Currency
  toCurrency: Currency
  usdWhite: number
  usdCash: number
  showWhite: boolean
  showCash: boolean
  busy?: boolean
  onConfirm: (convertedLimit: number) => void
  onCancel: () => void
}

function defaultRateOption(showWhite: boolean, showCash: boolean): RateOption {
  if (showWhite) return 'white'
  if (showCash) return 'cash'
  return 'manualLimit'
}

function manualLimitLabel(currency: Currency): string {
  return currency === Currency.ARS
    ? 'Ingresá tu nuevo límite en pesos'
    : 'Ingresá tu nuevo límite en dólares'
}

export function LimitConversionModal({
  open,
  currentLimit,
  fromCurrency,
  toCurrency,
  usdWhite,
  usdCash,
  showWhite,
  showCash,
  busy = false,
  onConfirm,
  onCancel,
}: LimitConversionModalProps) {
  const [rateOption, setRateOption] = useState<RateOption>(() =>
    defaultRateOption(showWhite, showCash),
  )
  const [manualLimitInput, setManualLimitInput] = useState('')

  useEffect(() => {
    if (!open) return
    setRateOption(defaultRateOption(showWhite, showCash))
    setManualLimitInput('')
  }, [open, showWhite, showCash])

  const parsedManualLimit = parseAmountInput(manualLimitInput)
  const manualLimitValid =
    parsedManualLimit != null && isValidMonthlyLimit(parsedManualLimit)

  const convertedLimit =
    rateOption === 'manualLimit'
      ? manualLimitValid
        ? parsedManualLimit
        : null
      : convertMonthlyLimit(
          currentLimit,
          fromCurrency,
          toCurrency,
          rateOption === 'white' ? usdWhite : usdCash,
        )

  const canConfirm = convertedLimit != null

  return (
    <Modal
      open={open}
      title="Convertir límite mensual"
      onClose={onCancel}
      elevated
    >
      <p className="mb-4 text-sm text-[var(--muted)]">
        Tu límite actual es{' '}
        <span className="font-medium text-[var(--text)]">
          {formatMoneyLabel(currentLimit, fromCurrency)}
        </span>
        . Elegí con qué cotización convertirlo a{' '}
        {toCurrency === Currency.ARS ? 'pesos' : 'dólares'}.
      </p>

      <div className="mb-4 space-y-2">
        {showWhite && (
          <RateOptionRow
            name="limit-rate"
            selected={rateOption === 'white'}
            disabled={busy}
            label="Blanco"
            rateLabel={formatExchangeRateLabel(usdWhite, AccountType.WHITE)}
            preview={formatMoneyLabel(
              convertMonthlyLimit(
                currentLimit,
                fromCurrency,
                toCurrency,
                usdWhite,
              ),
              toCurrency,
            )}
            onSelect={() => setRateOption('white')}
          />
        )}

        {showCash && (
          <RateOptionRow
            name="limit-rate"
            selected={rateOption === 'cash'}
            disabled={busy}
            label="Negro"
            rateLabel={formatExchangeRateLabel(usdCash, AccountType.CASH)}
            preview={formatMoneyLabel(
              convertMonthlyLimit(
                currentLimit,
                fromCurrency,
                toCurrency,
                usdCash,
              ),
              toCurrency,
            )}
            onSelect={() => setRateOption('cash')}
          />
        )}

        <div className="rounded-xl bg-[var(--surface-2)] p-3">
          <label className="flex min-h-11 cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="limit-rate"
              className="mt-1"
              disabled={busy}
              checked={rateOption === 'manualLimit'}
              onChange={() => setRateOption('manualLimit')}
            />
            <span className="flex-1">
              <span className="block text-sm font-medium">
                {manualLimitLabel(toCurrency)}
              </span>
              {rateOption === 'manualLimit' && (
                <AmountInput
                  className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] px-3 text-base outline-none focus:border-[var(--blue)]"
                  value={manualLimitInput}
                  aria-label={manualLimitLabel(toCurrency)}
                  onChange={setManualLimitInput}
                />
              )}
            </span>
          </label>
        </div>
      </div>

      <p className="mb-4 text-xs text-[var(--muted)]">
        Recordá que siempre podés modificar tu límite manualmente en
        Configuración → Límites, en caso de que esta conversión no te sirva.
        Esto solo modifica tu límite, no los valores con los que registraste
        los gastos.
      </p>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          disabled={busy}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          className="flex-1"
          disabled={busy || !canConfirm}
          onClick={() => {
            if (convertedLimit == null) return
            onConfirm(convertedLimit)
          }}
        >
          Confirmar
        </Button>
      </div>
    </Modal>
  )
}

function RateOptionRow({
  name,
  selected,
  disabled,
  label,
  rateLabel,
  preview,
  onSelect,
}: {
  name: string
  selected: boolean
  disabled: boolean
  label: string
  rateLabel: string
  preview: string
  onSelect: () => void
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl bg-[var(--surface-2)] p-3">
      <input
        type="radio"
        name={name}
        className="mt-1"
        disabled={disabled}
        checked={selected}
        onChange={onSelect}
      />
      <span className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <span>
          <span className="block text-sm font-medium">{label}</span>
          <span className="text-sm text-[var(--muted)] tabular-nums">
            {rateLabel}
          </span>
        </span>
        <span className="text-sm text-[var(--muted)]" aria-live="polite">
          →{' '}
          <span className="font-medium tabular-nums text-[var(--text)]">
            {preview}
          </span>
        </span>
      </span>
    </label>
  )
}
