import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { ACCOUNT_LABELS, CURRENCY_LABELS } from '@/constants/categories'
import { AmountInput } from '@/components/ui/AmountInput'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { VoiceUiPhase } from '@/hooks/useVoiceExpense'
import {
  accountExchangeRate,
  needsConversionPreview,
  previewAccountingAmount,
  type ExchangeRates,
} from '@/services/AccountingCurrency'
import type { VoiceExpenseDraft } from '@/services/voice/types'
import { AccountType, Category, Currency } from '@/types/enums'
import { formatExchangeRateLabel, formatMoneyLabel } from '@/utils/formatters'
import { formatAmountFromNumber, parseAmountInput } from '@/validators/amount'

export interface VoiceCategoryOption {
  id: string
  label: string
  category: Category
  description: string | null
  monthOnly: boolean
}

interface VoiceExpenseModalProps {
  open: boolean
  ui: VoiceUiPhase | null
  accepting?: boolean
  categoryOptions: VoiceCategoryOption[]
  enabledAccounts: AccountType[]
  enabledCurrencies: Currency[]
  accountingCurrency?: Currency
  exchangeRates?: ExchangeRates
  onAccept: (draft: VoiceExpenseDraft) => void
  onReject: () => void
  onFinishListening: (transcript?: string) => void
  onReinterpret: (transcript: string) => void
}

const selectClass =
  'min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--blue)]'
const inputClass =
  'min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--blue)]'

export function VoiceExpenseModal({
  open,
  ui,
  accepting,
  categoryOptions,
  enabledAccounts,
  enabledCurrencies,
  accountingCurrency,
  exchangeRates,
  onAccept,
  onReject,
  onFinishListening,
  onReinterpret,
}: VoiceExpenseModalProps) {
  const [transcriptEdit, setTranscriptEdit] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [detail, setDetail] = useState('')
  const [accountType, setAccountType] = useState(AccountType.WHITE)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(Currency.ARS)
  const [amountError, setAmountError] = useState(false)

  const previewKey = ui?.phase === 'preview' ? ui.transcript : ''

  const resolvedOptions = useMemo(() => {
    if (ui?.phase !== 'preview') return categoryOptions
    const draft = ui.draft
    if (!draft.monthOnlyCategory || !draft.description) return categoryOptions
    const name = draft.description.toLowerCase()
    if (
      categoryOptions.some(
        (option) => (option.description ?? '').toLowerCase() === name,
      )
    ) {
      return categoryOptions
    }
    return [
      ...categoryOptions,
      {
        id: `month:${name}`,
        label: draft.description,
        category: Category.OTHER,
        description: draft.description,
        monthOnly: true,
      },
    ]
  }, [categoryOptions, ui])

  useEffect(() => {
    if (ui?.phase !== 'preview') return
    const draft = ui.draft
    setCategoryId(idForDraft(draft, resolvedOptions))
    setDetail(draft.monthOnlyCategory ? '' : (draft.description ?? ''))
    setAccountType(
      enabledAccounts.includes(draft.accountType)
        ? draft.accountType
        : (enabledAccounts[0] ?? AccountType.WHITE),
    )
    setAmount(formatAmountFromNumber(draft.originalAmount))
    setCurrency(
      enabledCurrencies.includes(draft.originalCurrency)
        ? draft.originalCurrency
        : (enabledCurrencies[0] ?? Currency.ARS),
    )
    setAmountError(false)
    setTranscriptEdit(ui.transcript)
  }, [previewKey, ui, resolvedOptions, enabledAccounts, enabledCurrencies])

  useEffect(() => {
    if (ui?.phase === 'error') setTranscriptEdit(ui.transcript)
  }, [ui])

  const selectedOption = useMemo(
    () => resolvedOptions.find((option) => option.id === categoryId) ?? null,
    [categoryId, resolvedOptions],
  )

  const parsedAmount = parseAmountInput(amount)
  const showConversionPreview = needsConversionPreview(
    enabledCurrencies,
    currency,
    accountingCurrency,
  )
  const rate =
    exchangeRates != null ? accountExchangeRate(accountType, exchangeRates) : 1
  const previewAmount =
    showConversionPreview &&
    accountingCurrency != null &&
    parsedAmount != null &&
    exchangeRates
      ? previewAccountingAmount(
          parsedAmount,
          currency,
          accountingCurrency,
          accountType,
          exchangeRates,
        )
      : null

  const canAccept = ui?.phase === 'preview' && !accepting

  const handleAccept = () => {
    if (ui?.phase !== 'preview' || !selectedOption) return
    if (parsedAmount == null) {
      setAmountError(true)
      return
    }
    const namedOther = selectedOption.category === Category.OTHER && selectedOption.description
    const description = namedOther
      ? selectedOption.description
      : detail.trim()
        ? detail.trim()
        : null
    onAccept({
      accountType,
      category: selectedOption.category,
      description,
      originalAmount: parsedAmount,
      originalCurrency: currency,
      monthOnlyCategory: selectedOption.monthOnly,
      label: selectedOption.label,
    })
  }

  return (
    <Modal open={open} title="Audio" onClose={onReject}>
      {ui?.phase === 'unsupported' && (
        <p className="text-sm text-[var(--muted)]">
          Este navegador no permite grabar audio. Probá con Chrome o Safari.
        </p>
      )}

      {ui?.phase === 'loading' && (
        <p className="text-sm text-[var(--muted)]">{ui.message}</p>
      )}

      {ui?.phase === 'transcribing' && (
        <p className="text-sm text-[var(--muted)]">Ajustando transcripción…</p>
      )}

      {ui?.phase === 'listening' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--text)]">Escuchando…</p>
          <p className="min-h-12 rounded-xl bg-[var(--fill)] px-3 py-2 text-sm text-[var(--text)]">
            {ui.transcript || 'Hablá: gym, cinco dólares, cincuenta mil pesos…'}
          </p>
          <p className="text-xs text-[var(--muted)]">
            El texto aparece al instante. Al callarte se corrige con el reconocedor
            local para no perder “pesos” y “dólares”.
          </p>
        </div>
      )}

      {ui?.phase === 'error' && (
        <div className="space-y-2">
          <textarea
            className={`${inputClass} min-h-20 resize-y py-2`}
            aria-label="Transcripción"
            value={transcriptEdit}
            onChange={(event) => setTranscriptEdit(event.target.value)}
          />
          <p className="text-sm text-[var(--red)]" role="alert">
            {ui.message}
          </p>
        </div>
      )}

      {ui?.phase === 'preview' && (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm text-[var(--muted)]">Transcripción</span>
            <textarea
              className={`${inputClass} min-h-20 resize-y py-2`}
              aria-label="Transcripción"
              value={transcriptEdit}
              onChange={(event) => setTranscriptEdit(event.target.value)}
            />
          </label>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => onReinterpret(transcriptEdit)}
          >
            Releer texto
          </Button>

          <label className="block">
            <span className="mb-1 block text-sm text-[var(--muted)]">Categoría</span>
            <select
              className={selectClass}
              aria-label="Categoría"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              {resolvedOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.monthOnly ? `${option.label} (este mes)` : option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-[var(--muted)]">Detalle</span>
            <input
              type="text"
              className={inputClass}
              aria-label="Detalle"
              maxLength={40}
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              onFocus={placeCaretAtEnd}
              onClick={placeCaretAtEnd}
            />
          </label>

          {enabledAccounts.length > 1 ? (
            <label className="block">
              <span className="mb-1 block text-sm text-[var(--muted)]">Cuenta</span>
              <select
                className={selectClass}
                aria-label="Cuenta"
                value={accountType}
                onChange={(event) => setAccountType(event.target.value as AccountType)}
              >
                {enabledAccounts.map((account) => (
                  <option key={account} value={account}>
                    {ACCOUNT_LABELS[account]}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Cuenta:{' '}
              <span className="font-medium text-[var(--text)]">
                {ACCOUNT_LABELS[enabledAccounts[0] ?? accountType]}
              </span>
            </p>
          )}

          <label className="block">
            <span
              className={`mb-1 block text-sm ${amountError ? 'text-[var(--red)]' : 'text-[var(--muted)]'}`}
            >
              Importe
            </span>
            <AmountInput
              value={amount}
              onChange={(value) => {
                setAmount(value)
                if (amountError) setAmountError(false)
              }}
              className={`${inputClass} text-right tabular-nums ${
                amountError ? 'border-[var(--red)]' : ''
              }`}
              aria-label="Importe"
              aria-invalid={amountError}
            />
          </label>

          {showConversionPreview && accountingCurrency != null && (
            <div className="space-y-1 text-sm text-[var(--muted)]">
              <p className="flex items-center justify-end gap-2 tabular-nums">
                <span>{parsedAmount != null ? formatMoneyLabel(parsedAmount, currency) : '—'}</span>
                <ArrowRight size={16} aria-hidden />
                <span className="font-medium text-[var(--text)]">
                  {previewAmount != null
                    ? formatMoneyLabel(previewAmount, accountingCurrency)
                    : '—'}
                </span>
              </p>
              <p>{formatExchangeRateLabel(rate, accountType)}</p>
            </div>
          )}

          {enabledCurrencies.length > 1 ? (
            <label className="block">
              <span className="mb-1 block text-sm text-[var(--muted)]">Moneda</span>
              <select
                className={selectClass}
                aria-label="Moneda"
                value={currency}
                onChange={(event) => setCurrency(event.target.value as Currency)}
              >
                {enabledCurrencies.map((item) => (
                  <option key={item} value={item}>
                    {CURRENCY_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Moneda:{' '}
              <span className="font-medium text-[var(--text)]">
                {CURRENCY_LABELS[enabledCurrencies[0] ?? currency]}
              </span>
            </p>
          )}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="danger" onClick={onReject} disabled={accepting}>
          Rechazar
        </Button>
        {ui?.phase === 'listening' ? (
          <Button variant="success" onClick={() => onFinishListening()}>
            Listo
          </Button>
        ) : ui?.phase === 'loading' || ui?.phase === 'transcribing' ? (
          <Button variant="success" disabled>
            {ui.phase === 'loading' ? 'Cargando…' : 'Transcribiendo…'}
          </Button>
        ) : ui?.phase === 'error' ? (
          <Button variant="success" onClick={() => onReinterpret(transcriptEdit)}>
            Releer texto
          </Button>
        ) : (
          <Button variant="success" onClick={handleAccept} disabled={!canAccept}>
            Aceptar
          </Button>
        )}
      </div>
    </Modal>
  )
}

function placeCaretAtEnd(event: SyntheticEvent<HTMLInputElement>) {
  const input = event.currentTarget
  const len = input.value.length
  requestAnimationFrame(() => {
    input.setSelectionRange(len, len)
  })
}

function idForDraft(draft: VoiceExpenseDraft, options: VoiceCategoryOption[]): string {
  if (draft.monthOnlyCategory || (draft.category === Category.OTHER && draft.description)) {
    const name = (draft.description ?? draft.label).toLowerCase()
    return (
      options.find(
        (option) =>
          option.category === Category.OTHER &&
          (option.description ?? '').toLowerCase() === name,
      )?.id ??
      options[0]?.id ??
      ''
    )
  }
  if (draft.category === Category.OTHER) {
    return options.find((option) => option.id === 'other')?.id ?? options[0]?.id ?? ''
  }
  return (
    options.find(
      (option) => option.id === `fixed:${draft.category}`,
    )?.id ??
    options[0]?.id ??
    ''
  )
}
