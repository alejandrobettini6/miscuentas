import { useEffect, useMemo, useState } from 'react'
import {
  ACCOUNT_LABELS,
  CATEGORY_LABELS,
  CURRENCY_LABELS,
  FIXED_CATEGORIES,
  MAX_FIXED_CATEGORIES,
} from '@/constants/categories'
import {
  AccountType,
  Category,
  Currency,
  MonthMode,
  SummaryDisplayMode,
} from '@/types/enums'
import type { Expense, Income, Period, Settings } from '@/types/models'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { AmountInput } from '@/components/ui/AmountInput'
import { Input } from '@/components/ui/Input'
import { ExportService } from '@/services/ExportService'
import { normalizeAccountingCurrency } from '@/services/SettingsDefaults'
import {
  formatAmountFromNumber,
  isValidCustomCategoryName,
  isValidMonthlyLimit,
  normalizeCustomCategoryName,
  parseAmountInput,
} from '@/validators/amount'
import {
  draftFromSettings,
  type OnboardingDraft,
} from './onboardingDraft'

export type { OnboardingDraft } from './onboardingDraft'
export { draftFromSettings, draftToSettingsInput } from './onboardingDraft'

interface OnboardingWizardProps {
  open: boolean
  mode: 'initial' | 'reconfigure'
  settings: Settings
  expenses: Expense[]
  incomes?: Income[]
  periods: Period[]
  onSkip: () => Promise<void>
  onComplete: (draft: OnboardingDraft) => Promise<void>
  onClose?: () => void
}

type Step =
  | 'backup'
  | 'currency'
  | 'accountingCurrency'
  | 'accounts'
  | 'month'
  | 'summaryMode'
  | 'monthlyLimit'
  | 'categories'
  | 'confirm'

export function OnboardingWizard({
  open,
  mode,
  settings,
  expenses,
  incomes = [],
  periods,
  onSkip,
  onComplete,
  onClose,
}: OnboardingWizardProps) {
  const hasData = expenses.length > 0 || periods.length > 1
  const initialStep: Step =
    mode === 'reconfigure' && hasData ? 'backup' : 'currency'

  const [step, setStep] = useState<Step>(initialStep)
  const [backupSaved, setBackupSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [newCategoryLabel, setNewCategoryLabel] = useState('')
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [draft, setDraft] = useState<OnboardingDraft>(() =>
    draftFromSettings(settings),
  )

  useEffect(() => {
    if (!open) return
    setStep(mode === 'reconfigure' && hasData ? 'backup' : 'currency')
    setBackupSaved(false)
    setNewCategoryLabel('')
    setCategoryError(null)
    setDraft(draftFromSettings(settings))
  }, [open, mode, hasData, settings])

  const bothCurrencies =
    draft.enabledCurrencies.includes(Currency.ARS) &&
    draft.enabledCurrencies.includes(Currency.USD)

  const fixedCount =
    draft.enabledFixedCategories.length + draft.customCategories.length

  const title = useMemo(() => {
    switch (step) {
      case 'backup':
        return 'Antes de reconfigurar'
      case 'currency':
        return 'Monedas'
      case 'accountingCurrency':
        return 'Moneda de expresión'
      case 'accounts':
        return 'Cuentas'
      case 'month':
        return 'Cambio de mes'
      case 'summaryMode':
        return 'Resumen principal'
      case 'monthlyLimit':
        return 'Límite mensual'
      case 'categories':
        return 'Categorías fijas'
      case 'confirm':
        return 'Confirmación final'
      default:
        return 'Configuración'
    }
  }, [step])

  if (!open) return null

  const exportBackup = () => {
    ExportService.download(
      'miscuentas-backup.json',
      ExportService.toJson(expenses, settings, periods, incomes),
      'application/json',
    )
    setBackupSaved(true)
  }

  const goNext = () => {
    if (step === 'backup') setStep('currency')
    else if (step === 'currency') {
      if (bothCurrencies) setStep('accountingCurrency')
      else {
        setDraft((d) => ({
          ...d,
          accountingCurrency: normalizeAccountingCurrency(
            d.enabledCurrencies[0],
            d.enabledCurrencies,
          ),
        }))
        setStep('accounts')
      }
    } else if (step === 'accountingCurrency') setStep('accounts')
    else if (step === 'accounts') setStep('month')
    else if (step === 'month') setStep('summaryMode')
    else if (step === 'summaryMode') {
      if (draft.summaryDisplayMode === SummaryDisplayMode.LIMIT) {
        setStep('monthlyLimit')
      } else {
        setStep('categories')
      }
    } else if (step === 'monthlyLimit') setStep('categories')
    else if (step === 'categories') setStep('confirm')
  }

  const goBack = () => {
    if (step === 'confirm') setStep('categories')
    else if (step === 'categories') {
      if (draft.summaryDisplayMode === SummaryDisplayMode.LIMIT) {
        setStep('monthlyLimit')
      } else {
        setStep('summaryMode')
      }
    } else if (step === 'monthlyLimit') setStep('summaryMode')
    else if (step === 'summaryMode') setStep('month')
    else if (step === 'month') setStep('accounts')
    else if (step === 'accounts') {
      if (bothCurrencies) setStep('accountingCurrency')
      else setStep('currency')
    } else if (step === 'accountingCurrency') setStep('currency')
    else if (step === 'currency' && mode === 'reconfigure' && hasData) {
      setStep('backup')
    }
  }

  const handleSkip = async () => {
    setBusy(true)
    try {
      await onSkip()
    } finally {
      setBusy(false)
    }
  }

  const handleComplete = async () => {
    setBusy(true)
    try {
      await onComplete(draft)
    } finally {
      setBusy(false)
    }
  }

  const addCustomFixedCategory = () => {
    setCategoryError(null)
    if (!isValidCustomCategoryName(newCategoryLabel)) {
      setCategoryError('Nombre inválido (máx. 40 caracteres)')
      return
    }
    const name = normalizeCustomCategoryName(newCategoryLabel)
    const existsFixed = FIXED_CATEGORIES.some(
      (c) => CATEGORY_LABELS[c].toLowerCase() === name.toLowerCase(),
    )
    const existsCustom = draft.customCategories.some(
      (c) => c.toLowerCase() === name.toLowerCase(),
    )
    if (existsFixed || existsCustom) {
      setCategoryError('Esa categoría ya existe')
      return
    }
    if (fixedCount >= MAX_FIXED_CATEGORIES) {
      setCategoryError(`Máximo ${MAX_FIXED_CATEGORIES} categorías fijas`)
      return
    }
    setDraft((d) => ({
      ...d,
      customCategories: [...d.customCategories, name],
    }))
    setNewCategoryLabel('')
  }

  const removeCustomFixedCategory = (name: string) => {
    setDraft((d) => ({
      ...d,
      customCategories: d.customCategories.filter((c) => c !== name),
    }))
  }

  const toggleSuggestedCategory = (category: Category, checked: boolean) => {
    setCategoryError(null)
    if (!checked) {
      setDraft((d) => ({
        ...d,
        enabledFixedCategories: d.enabledFixedCategories.filter(
          (c) => c !== category,
        ),
      }))
      return
    }
    if (fixedCount >= MAX_FIXED_CATEGORIES) {
      setCategoryError(`Máximo ${MAX_FIXED_CATEGORIES} categorías fijas`)
      return
    }
    setDraft((d) => ({
      ...d,
      enabledFixedCategories: [...d.enabledFixedCategories, category],
    }))
  }

  const currencyOk = draft.enabledCurrencies.length > 0
  const accountsOk = draft.enabledAccounts.length > 0
  const limitParsed =
    draft.monthlyLimitInput.trim() === ''
      ? null
      : parseAmountInput(draft.monthlyLimitInput)
  const limitOk =
    limitParsed !== null && isValidMonthlyLimit(limitParsed)

  return (
    <Modal open={open} title={title} onClose={onClose ?? (() => undefined)}>
      {step === 'backup' && (
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-[var(--red)] bg-[var(--danger-bg)] p-4 text-[var(--red)]">
            <p className="font-bold">Exportá y guardá tu JSON ahora</p>
            <p className="mt-2 text-sm">
              Reconfigurar puede ocultar datos o generar errores si importás otra
              configuración. Guardá el archivo para poder restablecerlo más tarde.
            </p>
          </div>
          <Button className="w-full" onClick={exportBackup}>
            Exportar JSON de respaldo
          </Button>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={backupSaved}
              onChange={(e) => setBackupSaved(e.target.checked)}
            />
            <span>Ya exporté y guardé el archivo JSON en un lugar seguro</span>
          </label>
          <div className="flex gap-3">
            {onClose && (
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                Cancelar
              </Button>
            )}
            <Button
              className="flex-1"
              disabled={!backupSaved}
              onClick={goNext}
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === 'currency' && (
        <div className="space-y-4">
          <p className="text-[var(--muted)]">
            ¿Vas a usar esta cuenta para registrar gastos en Pesos, Dólares o ambos?
          </p>
          <CurrencyOptions
            value={draft.enabledCurrencies}
            onChange={(enabledCurrencies) =>
              setDraft((d) => ({
                ...d,
                enabledCurrencies,
                accountingCurrency: normalizeAccountingCurrency(
                  d.accountingCurrency,
                  enabledCurrencies,
                ),
              }))
            }
          />
          <WizardNav
            showSkip={mode === 'initial'}
            onSkip={() => void handleSkip()}
            onBack={mode === 'reconfigure' && hasData ? goBack : undefined}
            onNext={goNext}
            nextDisabled={!currencyOk}
            busy={busy}
          />
        </div>
      )}

      {step === 'accountingCurrency' && (
        <div className="space-y-4">
          <p className="text-[var(--muted)]">
            ¿En qué moneda querés expresar los límites y los valores principales?
            Si cargás un gasto en la otra moneda, se convierte al tipo de cambio.
          </p>
          <div className="space-y-2">
            <OptionButton
              selected={draft.accountingCurrency === Currency.USD}
              onClick={() =>
                setDraft((d) => ({ ...d, accountingCurrency: Currency.USD }))
              }
              label="Dólares (USD)"
              hint="Todo se expresa en USD. Los pesos se cotizan y se restan en dólares."
            />
            <OptionButton
              selected={draft.accountingCurrency === Currency.ARS}
              onClick={() =>
                setDraft((d) => ({ ...d, accountingCurrency: Currency.ARS }))
              }
              label="Pesos (ARS)"
              hint="Todo se expresa en pesos. Los dólares se convierten al tipo de cambio."
            />
          </div>
          <WizardNav
            showSkip={mode === 'initial'}
            onSkip={() => void handleSkip()}
            onBack={goBack}
            onNext={goNext}
            busy={busy}
          />
        </div>
      )}

      {step === 'accounts' && (
        <div className="space-y-4">
          <p className="text-[var(--muted)]">
            ¿Vas a usar esta cuenta para registrar gastos en Blanco y Negro, solo
            Blanco o solo Negro?
          </p>
          <AccountOptions
            value={draft.enabledAccounts}
            onChange={(enabledAccounts) =>
              setDraft((d) => ({ ...d, enabledAccounts }))
            }
          />
          <WizardNav
            showSkip={mode === 'initial'}
            onSkip={() => void handleSkip()}
            onBack={goBack}
            onNext={goNext}
            nextDisabled={!accountsOk}
            busy={busy}
          />
        </div>
      )}

      {step === 'month' && (
        <div className="space-y-4">
          <p className="text-[var(--muted)]">
            ¿Querés que la aplicación cambie de mes automáticamente o preferís
            cerrarlo manualmente?
          </p>
          <div className="space-y-2">
            <OptionButton
              selected={draft.monthMode === MonthMode.MANUAL}
              onClick={() =>
                setDraft((d) => ({ ...d, monthMode: MonthMode.MANUAL }))
              }
              label="Manual (recomendado)"
              hint="Vos cerrás el mes cuando quieras. El historial queda en solo lectura."
            />
            <OptionButton
              selected={draft.monthMode === MonthMode.AUTOMATIC}
              onClick={() =>
                setDraft((d) => ({ ...d, monthMode: MonthMode.AUTOMATIC }))
              }
              label="Automático"
              hint="Al cambiar el mes calendario se abre un período nuevo."
            />
          </div>
          <WizardNav
            showSkip={mode === 'initial'}
            onSkip={() => void handleSkip()}
            onBack={goBack}
            onNext={goNext}
            busy={busy}
          />
        </div>
      )}

      {step === 'summaryMode' && (
        <div className="space-y-4">
          <p className="text-[var(--muted)]">
            ¿Querés usar un límite de gastos o preferís ver la suma de lo que vas
            gastando como número principal?
          </p>
          <div className="space-y-2">
            <OptionButton
              selected={draft.summaryDisplayMode === SummaryDisplayMode.LIMIT}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  summaryDisplayMode: SummaryDisplayMode.LIMIT,
                }))
              }
              label="Usar límite de gastos"
              hint="El número grande muestra cuánto te queda disponible del presupuesto."
            />
            <OptionButton
              selected={draft.summaryDisplayMode === SummaryDisplayMode.TOTAL}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  summaryDisplayMode: SummaryDisplayMode.TOTAL,
                }))
              }
              label="Ver sumatoria de gastos"
              hint="El número grande muestra el total gastado del mes."
            />
          </div>
          <WizardNav
            showSkip={mode === 'initial'}
            onSkip={() => void handleSkip()}
            onBack={goBack}
            onNext={goNext}
            busy={busy}
          />
        </div>
      )}

      {step === 'monthlyLimit' && (
        <div className="space-y-4">
          <p className="text-[var(--muted)]">
            ¿Cuál es tu límite de gasto mensual
            {draft.accountingCurrency === Currency.ARS ? ' en pesos' : ' en dólares'}?
          </p>
          <AmountInput
            value={draft.monthlyLimitInput}
            onChange={(monthlyLimitInput) =>
              setDraft((d) => ({ ...d, monthlyLimitInput }))
            }
            aria-label="Límite mensual"
          />
          <WizardNav
            showSkip={mode === 'initial'}
            onSkip={() => void handleSkip()}
            onBack={goBack}
            onNext={() => {
              const parsed = parseAmountInput(draft.monthlyLimitInput)
              if (parsed === null || !isValidMonthlyLimit(parsed)) return
              setDraft((d) => ({ ...d, monthlyLimit: parsed }))
              goNext()
            }}
            nextDisabled={!limitOk}
            busy={busy}
          />
        </div>
      )}

      {step === 'categories' && (
        <div className="space-y-4">
          <p className="text-[var(--muted)]">
            Elegí categorías sugeridas o agregá las tuyas (máx.{' '}
            {MAX_FIXED_CATEGORIES} fijas). Después podés sumar más desde el
            inicio.
          </p>
          <p className="text-sm text-[var(--muted)]">
            Estas categorías representan tus gastos fijos recurrentes. Los
            gastos en Otros se consideran variables.
          </p>
          <p className="text-sm text-[var(--muted)]">
            {fixedCount} / {MAX_FIXED_CATEGORIES}
          </p>
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl bg-[var(--surface-2)] p-3">
            {FIXED_CATEGORIES.map((category) => {
              const checked = draft.enabledFixedCategories.includes(category)
              return (
                <label
                  key={category}
                  className="flex min-h-11 items-center gap-3 text-base"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSuggestedCategory(category, !checked)}
                  />
                  {CATEGORY_LABELS[category]}
                </label>
              )
            })}
            {draft.customCategories.map((name) => (
              <div
                key={name}
                className="flex min-h-11 items-center justify-between gap-3 text-base"
              >
                <span>{name}</span>
                <button
                  type="button"
                  className="text-sm text-[var(--red)]"
                  onClick={() => removeCustomFixedCategory(name)}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                label="Nueva categoría fija"
                name="new-fixed-category"
                value={newCategoryLabel}
                onChange={(e) => setNewCategoryLabel(e.target.value)}
                placeholder="Ej. Farmacia"
              />
            </div>
            <Button
              type="button"
              className="mt-7 shrink-0"
              onClick={addCustomFixedCategory}
              disabled={fixedCount >= MAX_FIXED_CATEGORIES}
            >
              Agregar
            </Button>
          </div>
          {categoryError && (
            <p className="text-sm text-[var(--red)]">{categoryError}</p>
          )}
          <WizardNav
            showSkip={mode === 'initial'}
            onSkip={() => void handleSkip()}
            onBack={goBack}
            onNext={goNext}
            busy={busy}
          />
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-[var(--red)] bg-[var(--danger-bg)] p-4 text-[var(--red)]">
            <p className="text-lg font-bold">Atención</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>
                Esta configuración puede ocultar movimientos, cuentas o monedas en
                el resumen y reportes.
              </li>
              <li>
                Si algo falla, usá el JSON exportado para importar y restablecer.
              </li>
              <li>
                Los movimientos no se borran al cambiar preferencias; solo se
                ocultan/recalculan.
              </li>
            </ul>
          </div>
          <div className="rounded-xl bg-[var(--surface-2)] p-3 text-sm">
            <p>
              Monedas:{' '}
              {draft.enabledCurrencies.map((c) => CURRENCY_LABELS[c]).join(', ')}
            </p>
            {bothCurrencies && (
              <p>
                Expresión:{' '}
                {draft.accountingCurrency === Currency.ARS ? 'Pesos' : 'Dólares'}
              </p>
            )}
            <p>
              Cuentas:{' '}
              {draft.enabledAccounts.map((a) => ACCOUNT_LABELS[a]).join(', ')}
            </p>
            <p>
              Mes:{' '}
              {draft.monthMode === MonthMode.MANUAL ? 'Manual' : 'Automático'}
            </p>
            <p>
              Resumen:{' '}
              {draft.summaryDisplayMode === SummaryDisplayMode.LIMIT
                ? 'Límite de gastos'
                : 'Sumatoria de gastos'}
            </p>
            {draft.summaryDisplayMode === SummaryDisplayMode.LIMIT && (
              <p>
                Límite mensual:{' '}
                {formatAmountFromNumber(
                  draft.monthlyLimit ??
                    parseAmountInput(draft.monthlyLimitInput) ??
                    0,
                )}{' '}
                {draft.accountingCurrency}
              </p>
            )}
            <p>
              Categorías fijas: {fixedCount} (sugeridas{' '}
              {draft.enabledFixedCategories.length} + propias{' '}
              {draft.customCategories.length})
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={busy}
              onClick={goBack}
            >
              Volver
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              disabled={busy}
              onClick={() => void handleComplete()}
            >
              Aplicar configuración
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function WizardNav({
  showSkip,
  onSkip,
  onBack,
  onNext,
  nextDisabled,
  busy,
}: {
  showSkip?: boolean
  onSkip?: () => void
  onBack?: () => void
  onNext: () => void
  nextDisabled?: boolean
  busy?: boolean
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {onBack && (
          <Button
            variant="secondary"
            className="flex-1"
            disabled={busy}
            onClick={onBack}
          >
            Atrás
          </Button>
        )}
        <Button
          className="flex-1"
          disabled={busy || nextDisabled}
          onClick={onNext}
        >
          Siguiente
        </Button>
      </div>
      {showSkip && onSkip && (
        <Button
          variant="ghost"
          className="w-full"
          disabled={busy}
          onClick={onSkip}
        >
          Saltear (usar todo habilitado)
        </Button>
      )}
    </div>
  )
}

function CurrencyOptions({
  value,
  onChange,
}: {
  value: Currency[]
  onChange: (value: Currency[]) => void
}) {
  const both =
    value.includes(Currency.ARS) && value.includes(Currency.USD)
  return (
    <div className="space-y-2">
      <OptionButton
        selected={value.length === 1 && value[0] === Currency.ARS}
        onClick={() => onChange([Currency.ARS])}
        label="Solo Pesos"
      />
      <OptionButton
        selected={value.length === 1 && value[0] === Currency.USD}
        onClick={() => onChange([Currency.USD])}
        label="Solo Dólares"
      />
      <OptionButton
        selected={both}
        onClick={() => onChange([Currency.ARS, Currency.USD])}
        label="Ambos"
      />
    </div>
  )
}

function AccountOptions({
  value,
  onChange,
}: {
  value: AccountType[]
  onChange: (value: AccountType[]) => void
}) {
  const both =
    value.includes(AccountType.WHITE) && value.includes(AccountType.CASH)
  return (
    <div className="space-y-2">
      <OptionButton
        selected={both}
        onClick={() => onChange([AccountType.WHITE, AccountType.CASH])}
        label="Blanco y Negro"
      />
      <OptionButton
        selected={value.length === 1 && value[0] === AccountType.WHITE}
        onClick={() => onChange([AccountType.WHITE])}
        label="Solo Blanco"
      />
      <OptionButton
        selected={value.length === 1 && value[0] === AccountType.CASH}
        onClick={() => onChange([AccountType.CASH])}
        label="Solo Negro"
      />
    </div>
  )
}

function OptionButton({
  selected,
  onClick,
  label,
  hint,
}: {
  selected: boolean
  onClick: () => void
  label: string
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left ${
        selected
          ? 'border-[var(--blue)] bg-[var(--info-bg)]'
          : 'border-[var(--border)] bg-[var(--surface)]'
      }`}
    >
      <span className="font-semibold">{label}</span>
      {hint && <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p>}
    </button>
  )
}
