import { useState } from 'react'
import { TRIP_FIXED_CATEGORIES, TRIP_CATEGORY_LABELS, type TripCategoryId } from '@/constants/tripCategories'
import { ACCOUNT_LABELS, CURRENCY_LABELS } from '@/constants/categories'
import { AccountType, Currency, SummaryDisplayMode } from '@/types/enums'
import type { CreateTripInput } from '@/types/models'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { AmountInput } from '@/components/ui/AmountInput'
import { parseAmountInput } from '@/validators/amount'

interface CreateTripWizardProps {
  open: boolean
  onClose: () => void
  onCreate: (input: CreateTripInput) => Promise<void>
  tripCount: number
}

type Step = 'name' | 'categories' | 'accounts' | 'budget' | 'monthly'

export function CreateTripWizard({
  open,
  onClose,
  onCreate,
  tripCount,
}: CreateTripWizardProps) {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    [...TRIP_FIXED_CATEGORIES],
  )
  const [enabledAccounts, setEnabledAccounts] = useState<AccountType[]>([
    AccountType.WHITE,
    AccountType.CASH,
  ])
  const [enabledCurrencies, setEnabledCurrencies] = useState<Currency[]>([
    Currency.USD,
    Currency.ARS,
  ])
  const [budgetMode, setBudgetMode] = useState<SummaryDisplayMode>(SummaryDisplayMode.TOTAL)
  const [budgetLimitStr, setBudgetLimitStr] = useState('')
  const [countsAgainst, setCountsAgainst] = useState(false)
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setStep('name')
    setName('')
    setSelectedCategories([...TRIP_FIXED_CATEGORIES])
    setEnabledAccounts([AccountType.WHITE, AccountType.CASH])
    setEnabledCurrencies([Currency.USD, Currency.ARS])
    setBudgetMode(SummaryDisplayMode.TOTAL)
    setBudgetLimitStr('')
    setCountsAgainst(false)
    setBusy(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    )
  }

  const toggleAccount = (acc: AccountType) => {
    setEnabledAccounts((prev) => {
      if (prev.includes(acc)) {
        const next = prev.filter((a) => a !== acc)
        return next.length > 0 ? next : prev
      }
      return [...prev, acc]
    })
  }

  const toggleCurrency = (cur: Currency) => {
    setEnabledCurrencies((prev) => {
      if (prev.includes(cur)) {
        const next = prev.filter((c) => c !== cur)
        return next.length > 0 ? next : prev
      }
      return [...prev, cur]
    })
  }

  const handleFinish = async () => {
    setBusy(true)
    try {
      let budgetLimit: number | null = null
      if (budgetMode === SummaryDisplayMode.LIMIT) {
        const parsed = parseAmountInput(budgetLimitStr)
        if (parsed !== null && parsed > 0) {
          budgetLimit = parsed
        }
      }
      await onCreate({
        name: name.trim() || `Viaje ${tripCount + 1}`,
        budgetMode,
        budgetLimit,
        countsAgainstMonthly: countsAgainst,
        enabledAccounts,
        enabledCurrencies,
        enabledCategories: selectedCategories,
      })
      reset()
    } catch {
      setBusy(false)
    }
  }

  const stepContent = () => {
    switch (step) {
      case 'name':
        return (
          <>
            <p className="mb-3 text-sm text-[var(--muted)]">
              Nombre del viaje (opcional)
            </p>
            <input
              type="text"
              value={name}
              maxLength={40}
              placeholder={`Viaje ${tripCount + 1}`}
              className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-base outline-none focus:border-[var(--blue)]"
              onChange={(e) => setName(e.target.value)}
            />
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={handleClose}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={() => setStep('categories')}>
                Siguiente
              </Button>
            </div>
          </>
        )

      case 'categories':
        return (
          <>
            <p className="mb-3 text-sm text-[var(--muted)]">
              Categorías para este viaje
            </p>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {TRIP_FIXED_CATEGORIES.map((cat) => (
                <label
                  key={cat}
                  className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 active:bg-[var(--press)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="h-5 w-5 accent-[var(--blue)]"
                  />
                  <span className="text-base">{TRIP_CATEGORY_LABELS[cat as TripCategoryId]}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setStep('name')}>
                Atrás
              </Button>
              <Button className="flex-1" onClick={() => setStep('accounts')}>
                Siguiente
              </Button>
            </div>
          </>
        )

      case 'accounts':
        return (
          <>
            <p className="mb-3 text-sm text-[var(--muted)]">Cuentas y monedas</p>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Cuentas
              </p>
              {([AccountType.WHITE, AccountType.CASH] as const).map((acc) => (
                <label
                  key={acc}
                  className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 active:bg-[var(--press)]"
                >
                  <input
                    type="checkbox"
                    checked={enabledAccounts.includes(acc)}
                    onChange={() => toggleAccount(acc)}
                    className="h-5 w-5 accent-[var(--blue)]"
                  />
                  <span className="text-base">{ACCOUNT_LABELS[acc]}</span>
                </label>
              ))}

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Monedas
              </p>
              {([Currency.USD, Currency.ARS] as const).map((cur) => (
                <label
                  key={cur}
                  className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 active:bg-[var(--press)]"
                >
                  <input
                    type="checkbox"
                    checked={enabledCurrencies.includes(cur)}
                    onChange={() => toggleCurrency(cur)}
                    className="h-5 w-5 accent-[var(--blue)]"
                  />
                  <span className="text-base">{CURRENCY_LABELS[cur]}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setStep('categories')}>
                Atrás
              </Button>
              <Button className="flex-1" onClick={() => setStep('budget')}>
                Siguiente
              </Button>
            </div>
          </>
        )

      case 'budget':
        return (
          <>
            <p className="mb-3 text-sm text-[var(--muted)]">Presupuesto del viaje</p>
            <div className="space-y-3">
              <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 active:bg-[var(--press)]">
                <input
                  type="radio"
                  name="budgetMode"
                  checked={budgetMode === SummaryDisplayMode.TOTAL}
                  onChange={() => setBudgetMode(SummaryDisplayMode.TOTAL)}
                  className="h-5 w-5 accent-[var(--blue)]"
                />
                <span className="text-base">Sin límite (acumulación)</span>
              </label>
              <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 active:bg-[var(--press)]">
                <input
                  type="radio"
                  name="budgetMode"
                  checked={budgetMode === SummaryDisplayMode.LIMIT}
                  onChange={() => setBudgetMode(SummaryDisplayMode.LIMIT)}
                  className="h-5 w-5 accent-[var(--blue)]"
                />
                <span className="text-base">Con límite</span>
              </label>

              {budgetMode === SummaryDisplayMode.LIMIT && (
                <div className="mt-2">
                  <p className="mb-2 text-sm text-[var(--muted)]">Límite máximo del viaje</p>
                  <AmountInput
                    value={budgetLimitStr}
                    onChange={setBudgetLimitStr}
                    className="min-h-12 w-full rounded-xl border border-[var(--border)] px-4 text-center text-2xl outline-none focus:border-[var(--blue)]"
                    aria-label="Límite del viaje"
                  />
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setStep('accounts')}>
                Atrás
              </Button>
              <Button className="flex-1" onClick={() => setStep('monthly')}>
                Siguiente
              </Button>
            </div>
          </>
        )

      case 'monthly':
        return (
          <>
            <p className="mb-3 text-sm text-[var(--muted)]">
              ¿Los gastos de este viaje cuentan contra el límite mensual?
            </p>
            <div className="space-y-3">
              <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 active:bg-[var(--press)]">
                <input
                  type="radio"
                  name="countsAgainst"
                  checked={!countsAgainst}
                  onChange={() => setCountsAgainst(false)}
                  className="h-5 w-5 accent-[var(--blue)]"
                />
                <span className="text-base">No, independiente</span>
              </label>
              <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 active:bg-[var(--press)]">
                <input
                  type="radio"
                  name="countsAgainst"
                  checked={countsAgainst}
                  onChange={() => setCountsAgainst(true)}
                  className="h-5 w-5 accent-[var(--blue)]"
                />
                <span className="text-base">Sí, cuenta contra el límite mensual</span>
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setStep('budget')}>
                Atrás
              </Button>
              <Button className="flex-1" disabled={busy} onClick={() => void handleFinish()}>
                Crear viaje
              </Button>
            </div>
          </>
        )
    }
  }

  const stepTitles: Record<Step, string> = {
    name: 'Nuevo viaje',
    categories: 'Categorías',
    accounts: 'Cuentas y monedas',
    budget: 'Presupuesto',
    monthly: 'Límite mensual',
  }

  return (
    <Modal open={open} title={stepTitles[step]} onClose={handleClose}>
      {stepContent()}
    </Modal>
  )
}
