import { useEffect, useRef, useState } from 'react'
import { Currency } from '@/types/enums'
import { formatAmountFromNumber, parseAmountInput } from '@/validators/amount'
import { AmountInput } from './AmountInput'
import { Button } from './Button'

interface AmountSheetProps {
  open: boolean
  title: string
  initialAmount?: string
  initialCurrency?: Currency
  showCategoryName?: boolean
  onSubmit: (amount: string, currency: Currency, categoryName?: string) => void
  onCancel: () => void
}

export function AmountSheet({
  open,
  title,
  initialAmount = '',
  initialCurrency = Currency.USD,
  showCategoryName = false,
  onSubmit,
  onCancel,
}: AmountSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [amount, setAmount] = useState(initialAmount)
  const [currency, setCurrency] = useState(initialCurrency)
  const [categoryName, setCategoryName] = useState('')
  const [amountError, setAmountError] = useState(false)
  const submittedRef = useRef(false)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!open) return
    submittedRef.current = false
    cancelledRef.current = false
    setAmountError(false)
    setAmount(
      initialAmount
        ? initialAmount.includes('.') || initialAmount.includes(',')
          ? initialAmount
          : formatAmountFromNumber(Number(initialAmount))
        : '',
    )
    setCurrency(initialCurrency)
    setCategoryName('')
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [open, initialAmount, initialCurrency, showCategoryName])

  if (!open) return null

  const commit = (options?: { dismissIfEmpty?: boolean }) => {
    if (submittedRef.current || cancelledRef.current) return

    const parsed = parseAmountInput(amount)
    if (parsed === null) {
      // Tap fuera con monto vacío: cierra sin registrar (comportamiento previo).
      if (options?.dismissIfEmpty && !amount.trim()) {
        cancelledRef.current = true
        onCancel()
        return
      }
      setAmountError(true)
      inputRef.current?.focus()
      return
    }

    setAmountError(false)
    submittedRef.current = true
    onSubmit(
      amount,
      currency,
      showCategoryName ? categoryName : undefined,
    )
  }

  const scheduleCommit = () => {
    window.setTimeout(() => {
      if (cancelledRef.current || submittedRef.current) return
      if (panelRef.current?.contains(document.activeElement)) return
      commit({ dismissIfEmpty: true })
    }, 0)
  }

  const handleCancel = () => {
    cancelledRef.current = true
    onCancel()
  }

  const handleAmountChange = (value: string) => {
    setAmount(value)
    if (amountError) setAmountError(false)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
      <div ref={panelRef} className="w-full max-w-md rounded-2xl bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>

        <div
          className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-[#e5e5ea] p-1"
          role="group"
          aria-label="Moneda"
        >
          {[Currency.USD, Currency.ARS].map((item) => (
            <button
              key={item}
              type="button"
              aria-label={item}
              aria-pressed={currency === item}
              className={`min-h-11 rounded-lg font-semibold ${
                currency === item ? 'bg-white shadow-sm' : 'text-[var(--muted)]'
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setCurrency(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <label className="mb-4 block" htmlFor="amount-input">
          <span
            className={`mb-2 block text-sm font-medium ${
              amountError ? 'text-[var(--red)]' : 'text-[var(--text)]'
            }`}
          >
            Ingresá el monto
          </span>
          <AmountInput
            id="amount-input"
            ref={inputRef}
            value={amount}
            onChange={handleAmountChange}
            onBlur={scheduleCommit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commit()
              }
            }}
            className={`min-h-14 w-full rounded-xl border px-4 text-center text-3xl outline-none ${
              amountError
                ? 'border-[var(--red)] focus:border-[var(--red)]'
                : 'border-[var(--border)] focus:border-[var(--blue)]'
            }`}
            aria-label="Ingresá el monto"
            aria-invalid={amountError}
            aria-describedby={amountError ? 'amount-error' : undefined}
          />
          {amountError && (
            <p id="amount-error" className="mt-2 text-sm text-[var(--red)]" role="alert">
              El monto es obligatorio
            </p>
          )}
        </label>

        {showCategoryName && (
          <label className="mb-4 block" htmlFor="category-name-input">
            <span className="mb-2 block text-sm font-medium text-[var(--text)]">
              Nombre de categoría (opcional)
            </span>
            <input
              id="category-name-input"
              type="text"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              onBlur={scheduleCommit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  commit()
                }
              }}
              placeholder="Vacío = Otros"
              maxLength={40}
              className="min-h-12 w-full rounded-xl border border-[var(--border)] px-4 text-base outline-none focus:border-[var(--blue)]"
              aria-label="Nombre de categoría (opcional)"
            />
          </label>
        )}

        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleCancel}
            aria-label="Cancelar"
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => commit()}
            aria-label="Aceptar"
          >
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  )
}
