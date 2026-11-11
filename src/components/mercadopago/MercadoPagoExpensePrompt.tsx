import { useEffect, useMemo, useState } from 'react'
import { CATEGORY_LABELS } from '@/constants/categories'
import { Button } from '@/components/ui/Button'
import { AmountInput } from '@/components/ui/AmountInput'
import {
  accountExchangeRate,
  needsConversionPreview,
  previewAccountingAmount,
  resolveAccountingCurrency,
  type ExchangeRates,
} from '@/services/AccountingCurrency'
import type { MercadoPagoReview } from '@/services/mercadopago/planNotice'
import { Category, Currency, type AccountType } from '@/types/enums'
import type { Settings } from '@/types/models'
import { formatExchangeRateLabel, formatMoneyLabel } from '@/utils/formatters'
import {
  formatAmountFromNumber,
  isValidCustomCategoryName,
  normalizeCustomCategoryName,
  parseAmountInput,
} from '@/validators/amount'

export interface MercadoPagoPromptResult {
  amount: number
  currency: Currency
  accountType: AccountType
  category: Category
  description: string | null
  customExchangeRate: number | null
}

interface MercadoPagoExpensePromptProps {
  review: MercadoPagoReview
  settings: Settings
  busy: boolean
  onConfirm: (result: MercadoPagoPromptResult) => void
  onDismiss: () => void
}

interface CategoryOption {
  id: string
  label: string
  category: Category
  customName: string | null
}

export function MercadoPagoExpensePrompt({
  review,
  settings,
  busy,
  onConfirm,
  onDismiss,
}: MercadoPagoExpensePromptProps) {
  const options = useMemo(() => buildOptions(settings), [settings])
  const initialOption =
    options.find((option) =>
      review.customName
        ? option.customName === review.customName
        : option.category === review.category && option.customName == null,
    )?.id ?? ''

  const [amount, setAmount] = useState(formatAmountFromNumber(review.amount))
  const [currency, setCurrency] = useState(review.currency)
  const [optionId, setOptionId] = useState(initialOption)
  const [detail, setDetail] = useState(review.detail)
  const [customRate, setCustomRate] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAmount(formatAmountFromNumber(review.amount))
    setCurrency(review.currency)
    setOptionId(initialOption)
    setDetail(review.detail)
    setCustomRate('')
    setError(null)
  }, [review, initialOption])

  const enabledCurrencies = settings.enabledCurrencies
  const showCurrencyToggle = enabledCurrencies.length > 1
  const accountingCurrency = resolveAccountingCurrency(settings)
  const rates: ExchangeRates = {
    usdWhite: settings.usdWhite,
    usdCash: settings.usdCash,
  }
  const showCustomExchangeRate =
    enabledCurrencies.length > 1 && currency === Currency.ARS
  const parsedCustom = customRate.trim() ? parseAmountInput(customRate) : null
  const effectiveCustom =
    showCustomExchangeRate && parsedCustom != null && parsedCustom > 0
      ? parsedCustom
      : null
  const parsedAmount = parseAmountInput(amount)
  const preview =
    needsConversionPreview(enabledCurrencies, currency, accountingCurrency) &&
    parsedAmount != null
      ? previewAccountingAmount(
          parsedAmount,
          currency,
          accountingCurrency,
          review.accountType,
          rates,
          effectiveCustom,
        )
      : null
  const displayRate =
    effectiveCustom ?? accountExchangeRate(review.accountType, rates)

  const submit = () => {
    const parsed = parseAmountInput(amount)
    if (parsed == null) {
      setError('El monto es obligatorio')
      return
    }
    const option = options.find((item) => item.id === optionId)
    if (!option) {
      setError('Elegí una categoría')
      return
    }
    let customExchangeRate: number | null = null
    if (showCustomExchangeRate && customRate.trim()) {
      if (parsedCustom == null || parsedCustom <= 0) {
        setError('La cotización no es válida')
        return
      }
      customExchangeRate = parsedCustom
    }

    const trimmed = detail.trim()
    let description: string | null = null
    if (option.customName) {
      description = normalizeCustomCategoryName(option.customName)
    } else if (option.category === Category.OTHER) {
      if (trimmed && !isValidCustomCategoryName(trimmed)) {
        setError('El detalle puede tener hasta 40 caracteres')
        return
      }
      description = trimmed ? normalizeCustomCategoryName(trimmed) : null
    } else if (trimmed) {
      if (!isValidCustomCategoryName(trimmed)) {
        setError('El detalle puede tener hasta 40 caracteres')
        return
      }
      description = normalizeCustomCategoryName(trimmed)
    }

    setError(null)
    onConfirm({
      amount: parsed,
      currency,
      accountType: review.accountType,
      category: option.category,
      description,
      customExchangeRate,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--overlay)] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Vimos que hiciste un gasto con Mercado Pago"
    >
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-[var(--surface)] p-5">
        <h2 className="mb-2 text-lg font-semibold">
          Vimos que hiciste un gasto con Mercado Pago
        </h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          {review.kind === 'transfer' ? 'Transferencia' : 'Pago'} ·{' '}
          {formatMoneyLabel(review.amount, Currency.ARS)}
          {review.detail ? ` · ${review.detail}` : ''}
        </p>

        {showCurrencyToggle ? (
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-[var(--fill)] p-1">
            {enabledCurrencies.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={currency === item}
                className={`min-h-10 rounded-lg font-semibold ${
                  currency === item
                    ? 'bg-[var(--segment-active)] text-[var(--text)]'
                    : 'text-[var(--muted)]'
                }`}
                onClick={() => setCurrency(item)}
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}

        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-medium">Monto</span>
          <AmountInput
            value={amount}
            onChange={setAmount}
            aria-label="Monto"
            className="min-h-14 w-full rounded-xl border border-[var(--border)] px-4 text-center text-3xl outline-none focus:border-[var(--blue)]"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-medium">Categoría</span>
          <select
            value={optionId}
            onChange={(event) => setOptionId(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"
            aria-label="Categoría"
          >
            <option value="">Elegí una categoría</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-medium">Detalle</span>
          <input
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            maxLength={40}
            aria-label="Detalle del gasto"
            className="min-h-12 w-full rounded-xl border border-[var(--border)] px-4 outline-none focus:border-[var(--blue)]"
          />
        </label>

        {showCustomExchangeRate && (
          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-medium">
              Cotización personalizada (opcional)
            </span>
            <input
              value={customRate}
              onChange={(event) => setCustomRate(event.target.value)}
              inputMode="decimal"
              aria-label="Cotización personalizada"
              placeholder={formatAmountFromNumber(displayRate)}
              className="min-h-12 w-full rounded-xl border border-[var(--border)] px-4 outline-none focus:border-[var(--blue)]"
            />
            <p className="mt-2 text-sm text-[var(--muted)]">
              {effectiveCustom != null
                ? `Cotización personalizada: $ ${formatAmountFromNumber(displayRate)}`
                : formatExchangeRateLabel(displayRate, review.accountType)}
            </p>
            {preview != null && (
              <p className="text-sm text-[var(--muted)]">
                Se registrará:{' '}
                <span className="font-medium text-[var(--text)]">
                  {formatMoneyLabel(preview, accountingCurrency)}
                </span>
              </p>
            )}
          </label>
        )}

        {error && (
          <p className="mb-3 text-sm text-[var(--red)]" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onDismiss} disabled={busy}>
            Ahora no
          </Button>
          <Button onClick={submit} disabled={busy} className="flex-1">
            Agregar gasto
          </Button>
        </div>
      </div>
    </div>
  )
}

function buildOptions(settings: Settings): CategoryOption[] {
  const fixed = settings.enabledFixedCategories
    .filter((category) => category !== Category.OTHER)
    .map((category) => ({
      id: category,
      label: CATEGORY_LABELS[category],
      category,
      customName: null,
    }))
  const custom = settings.customCategories.map((name) => ({
    id: `custom:${name}`,
    label: name,
    category: Category.OTHER,
    customName: name,
  }))
  return [
    ...fixed,
    ...custom,
    {
      id: Category.OTHER,
      label: CATEGORY_LABELS[Category.OTHER],
      category: Category.OTHER,
      customName: null,
    },
  ]
}
