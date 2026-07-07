import { useEffect, useRef, useState } from 'react'
import { Currency } from '@/types/enums'
import { formatAmountFromNumber } from '@/validators/amount'
import { AmountInput } from './AmountInput'
import { Button } from './Button'

interface AmountSheetProps {
  open: boolean
  title: string
  initialAmount?: string
  initialCurrency?: Currency
  onSubmit: (amount: string, currency: Currency) => void
  onCancel: () => void
}

export function AmountSheet({
  open,
  title,
  initialAmount = '',
  initialCurrency = Currency.USD,
  onSubmit,
  onCancel,
}: AmountSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [amount, setAmount] = useState(initialAmount)
  const [currency, setCurrency] = useState(initialCurrency)
  const submittedRef = useRef(false)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!open) return
    submittedRef.current = false
    cancelledRef.current = false
    setAmount(
      initialAmount
        ? initialAmount.includes('.') || initialAmount.includes(',')
          ? initialAmount
          : formatAmountFromNumber(Number(initialAmount))
        : '',
    )
    setCurrency(initialCurrency)
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [open, initialAmount, initialCurrency])

  if (!open) return null

  const commit = () => {
    if (submittedRef.current || cancelledRef.current) return
    if (!amount.trim()) {
      cancelledRef.current = true
      onCancel()
      return
    }
    submittedRef.current = true
    onSubmit(amount, currency)
  }

  const handleCancel = () => {
    cancelledRef.current = true
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5">
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
          <span className="sr-only">Importe</span>
          <AmountInput
            id="amount-input"
            ref={inputRef}
            value={amount}
            onChange={setAmount}
            onBlur={() => {
              window.setTimeout(commit, 0)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                inputRef.current?.blur()
              }
            }}
            className="min-h-14 w-full rounded-xl border border-[var(--border)] px-4 text-center text-3xl outline-none focus:border-[var(--blue)]"
            aria-label="Importe"
          />
        </label>

        <Button
          variant="ghost"
          className="w-full"
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleCancel}
          aria-label="Cancelar"
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
