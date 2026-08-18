import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { ACCOUNT_LABELS, CURRENCY_LABELS } from '@/constants/categories'
import {
  TRIP_FIXED_CATEGORIES,
  TRIP_CATEGORY_LABELS,
  type TripCategoryId,
} from '@/constants/tripCategories'
import { AccountType, Currency, SummaryDisplayMode } from '@/types/enums'
import type { Trip, UpdateTripInput } from '@/types/models'
import { AmountInput } from '@/components/ui/AmountInput'
import { Modal } from '@/components/ui/Modal'
import { useBackButtonClose } from '@/hooks/useBackButtonClose'
import { formatAmountFromNumber, parseAmountInput } from '@/validators/amount'
import toast from 'react-hot-toast'
import { getErrorMessage } from '@/utils/errors'

interface TripSettingsSideMenuProps {
  open: boolean
  trip: Trip
  onClose: () => void
  onUpdate: (tripId: string, input: UpdateTripInput) => Promise<void>
}

export function TripSettingsSideMenu({
  open,
  trip,
  onClose,
  onUpdate,
}: TripSettingsSideMenuProps) {
  const [editField, setEditField] = useState<'name' | 'budgetLimit' | null>(null)
  const [fieldValue, setFieldValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useBackButtonClose(open, onClose)

  useEffect(() => {
    if (editField) {
      window.setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [editField])

  if (!open) return null

  const save = async (input: UpdateTripInput) => {
    try {
      await onUpdate(trip.id, input)
      toast.success('Guardado')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Error al guardar'))
    }
  }

  const openNameEdit = () => {
    setFieldValue(trip.name)
    setEditField('name')
  }

  const openLimitEdit = () => {
    setFieldValue(formatAmountFromNumber(trip.budgetLimit ?? 0))
    setEditField('budgetLimit')
  }

  const saveField = async () => {
    if (!editField) return
    const field = editField
    setEditField(null)

    if (field === 'name') {
      const trimmed = fieldValue.trim()
      if (trimmed && trimmed !== trip.name) {
        await save({ name: trimmed })
      }
      return
    }

    if (field === 'budgetLimit') {
      const parsed = parseAmountInput(fieldValue)
      if (parsed !== null && parsed >= 0) {
        await save({ budgetLimit: parsed || null })
      }
    }
  }

  const toggleAccount = async (acc: AccountType) => {
    const current = trip.enabledAccounts
    if (current.includes(acc)) {
      const next = current.filter((a) => a !== acc)
      if (next.length === 0) return
      await save({ enabledAccounts: next })
    } else {
      await save({ enabledAccounts: [...current, acc] })
    }
  }

  const toggleCurrency = async (cur: Currency) => {
    const current = trip.enabledCurrencies
    if (current.includes(cur)) {
      const next = current.filter((c) => c !== cur)
      if (next.length === 0) return
      await save({ enabledCurrencies: next })
    } else {
      await save({ enabledCurrencies: [...current, cur] })
    }
  }

  const toggleCategory = async (cat: string) => {
    const current = trip.enabledCategories
    if (current.includes(cat)) {
      await save({ enabledCategories: current.filter((c) => c !== cat) })
    } else {
      await save({ enabledCategories: [...current, cat] })
    }
  }

  const toggleBudgetMode = async () => {
    const next =
      trip.budgetMode === SummaryDisplayMode.LIMIT
        ? SummaryDisplayMode.TOTAL
        : SummaryDisplayMode.LIMIT
    await save({ budgetMode: next })
  }

  const toggleCountsAgainst = async () => {
    await save({ countsAgainstMonthly: !trip.countsAgainstMonthly })
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[var(--overlay)]" onClick={onClose} />
      <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(100%,320px)] flex-col bg-[var(--surface)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-lg font-semibold">Config. viaje</h2>
          <button
            type="button"
            className="flex min-h-11 min-w-11 items-center justify-center"
            aria-label="Cerrar configuración"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <Section title="General">
            <MenuButton label={`Nombre: ${trip.name}`} onClick={openNameEdit} />
          </Section>

          <Section title="Presupuesto">
            <MenuButton
              label={trip.budgetMode === SummaryDisplayMode.LIMIT ? 'Modo: Límite' : 'Modo: Acumulación'}
              onClick={() => void toggleBudgetMode()}
            />
            {trip.budgetMode === SummaryDisplayMode.LIMIT && (
              <MenuButton
                label={`Límite: ${trip.budgetLimit ?? 'Sin definir'}`}
                onClick={openLimitEdit}
              />
            )}
            <MenuButton
              label={
                trip.countsAgainstMonthly
                  ? 'Cuenta contra límite mensual: Sí'
                  : 'Cuenta contra límite mensual: No'
              }
              onClick={() => void toggleCountsAgainst()}
            />
          </Section>

          <Section title="Cuentas">
            {([AccountType.WHITE, AccountType.CASH] as const).map((acc) => (
              <label
                key={acc}
                className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-[var(--surface)] px-4 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={trip.enabledAccounts.includes(acc)}
                  onChange={() => void toggleAccount(acc)}
                  className="h-5 w-5 accent-[var(--blue)]"
                />
                <span className="text-sm">{ACCOUNT_LABELS[acc]}</span>
              </label>
            ))}
          </Section>

          <Section title="Monedas">
            {([Currency.USD, Currency.ARS] as const).map((cur) => (
              <label
                key={cur}
                className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-[var(--surface)] px-4 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={trip.enabledCurrencies.includes(cur)}
                  onChange={() => void toggleCurrency(cur)}
                  className="h-5 w-5 accent-[var(--blue)]"
                />
                <span className="text-sm">{CURRENCY_LABELS[cur]}</span>
              </label>
            ))}
          </Section>

          <Section title="Categorías">
            {TRIP_FIXED_CATEGORIES.map((cat) => (
              <label
                key={cat}
                className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-[var(--surface)] px-4 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={trip.enabledCategories.includes(cat)}
                  onChange={() => void toggleCategory(cat)}
                  className="h-5 w-5 accent-[var(--blue)]"
                />
                <span className="text-sm">
                  {TRIP_CATEGORY_LABELS[cat as TripCategoryId]}
                </span>
              </label>
            ))}
          </Section>
        </div>
      </aside>

      <Modal
        open={editField !== null}
        title={editField === 'name' ? 'Nombre del viaje' : 'Límite del viaje'}
        onClose={() => setEditField(null)}
      >
        {editField === 'name' ? (
          <input
            ref={inputRef}
            type="text"
            value={fieldValue}
            maxLength={40}
            className="min-h-14 w-full rounded-xl border border-[var(--border)] px-4 text-center text-xl outline-none focus:border-[var(--blue)]"
            onChange={(e) => setFieldValue(e.target.value)}
            onBlur={() => void saveField()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            aria-label="Nombre"
          />
        ) : (
          <AmountInput
            ref={inputRef}
            value={fieldValue}
            onChange={setFieldValue}
            onBlur={() => void saveField()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            className="min-h-14 w-full rounded-xl border border-[var(--border)] px-4 text-center text-3xl outline-none focus:border-[var(--blue)]"
            aria-label="Límite"
          />
        )}
      </Modal>
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
        {title}
      </h3>
      <div className="overflow-hidden rounded-2xl bg-[var(--surface-2)]">{children}</div>
    </section>
  )
}

function MenuButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex min-h-11 w-full items-center border-b border-[var(--surface)] px-4 text-left text-sm text-[var(--text)] last:border-b-0"
      onClick={onClick}
      aria-label={label}
    >
      {label}
    </button>
  )
}
