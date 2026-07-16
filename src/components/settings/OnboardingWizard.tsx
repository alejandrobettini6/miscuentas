import { useEffect, useMemo, useState } from 'react'
import {
  ACCOUNT_LABELS,
  CATEGORY_LABELS,
  CURRENCY_LABELS,
  FIXED_CATEGORIES,
} from '@/constants/categories'
import { AccountType, Category, Currency, MonthMode } from '@/types/enums'
import type { Settings, UpdateSettingsInput } from '@/types/models'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ExportService } from '@/services/ExportService'
import type { Expense, Period } from '@/types/models'

export type OnboardingDraft = {
  enabledCurrencies: Currency[]
  enabledAccounts: AccountType[]
  monthMode: MonthMode
  enabledFixedCategories: Category[]
}

interface OnboardingWizardProps {
  open: boolean
  mode: 'initial' | 'reconfigure'
  settings: Settings
  expenses: Expense[]
  periods: Period[]
  onSkip: () => Promise<void>
  onComplete: (draft: OnboardingDraft) => Promise<void>
  onClose?: () => void
}

type Step =
  | 'backup'
  | 'currency'
  | 'accounts'
  | 'month'
  | 'categories'
  | 'confirm'

export function OnboardingWizard({
  open,
  mode,
  settings,
  expenses,
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
  const [draft, setDraft] = useState<OnboardingDraft>(() => ({
    enabledCurrencies: [...settings.enabledCurrencies],
    enabledAccounts: [...settings.enabledAccounts],
    monthMode: MonthMode.MANUAL,
    enabledFixedCategories: [...settings.enabledFixedCategories],
  }))

  useEffect(() => {
    if (!open) return
    setStep(mode === 'reconfigure' && hasData ? 'backup' : 'currency')
    setBackupSaved(false)
    setDraft({
      enabledCurrencies: [...settings.enabledCurrencies],
      enabledAccounts: [...settings.enabledAccounts],
      monthMode: MonthMode.MANUAL,
      enabledFixedCategories: [...settings.enabledFixedCategories],
    })
  }, [open, mode, hasData, settings])

  const title = useMemo(() => {
    switch (step) {
      case 'backup':
        return 'Antes de reconfigurar'
      case 'currency':
        return 'Monedas'
      case 'accounts':
        return 'Cuentas'
      case 'month':
        return 'Cambio de mes'
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
      ExportService.toJson(expenses, settings, periods),
      'application/json',
    )
    setBackupSaved(true)
  }

  const goNext = () => {
    if (step === 'backup') setStep('currency')
    else if (step === 'currency') setStep('accounts')
    else if (step === 'accounts') setStep('month')
    else if (step === 'month') setStep('categories')
    else if (step === 'categories') setStep('confirm')
  }

  const goBack = () => {
    if (step === 'confirm') setStep('categories')
    else if (step === 'categories') setStep('month')
    else if (step === 'month') setStep('accounts')
    else if (step === 'accounts') setStep('currency')
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

  const currencyOk = draft.enabledCurrencies.length > 0
  const accountsOk = draft.enabledAccounts.length > 0

  return (
    <Modal open={open} title={title} onClose={onClose ?? (() => undefined)}>
      {step === 'backup' && (
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-[var(--red)] bg-[#ffe5e5] p-4 text-[var(--red)]">
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
              setDraft((d) => ({ ...d, enabledCurrencies }))
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

      {step === 'categories' && (
        <div className="space-y-4">
          <p className="text-[var(--muted)]">
            ¿Qué categorías fijas querés usar? Las desmarcadas quedan ocultas
            (sin borrar movimientos).
          </p>
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl bg-[#f2f2f7] p-3">
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
                    onChange={() => {
                      setDraft((d) => ({
                        ...d,
                        enabledFixedCategories: checked
                          ? d.enabledFixedCategories.filter((c) => c !== category)
                          : [...d.enabledFixedCategories, category],
                      }))
                    }}
                  />
                  {CATEGORY_LABELS[category]}
                </label>
              )
            })}
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

      {step === 'confirm' && (
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-[var(--red)] bg-[#ffe5e5] p-4 text-[var(--red)]">
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
          <div className="rounded-xl bg-[#f2f2f7] p-3 text-sm">
            <p>
              Monedas:{' '}
              {draft.enabledCurrencies.map((c) => CURRENCY_LABELS[c]).join(', ')}
            </p>
            <p>
              Cuentas:{' '}
              {draft.enabledAccounts.map((a) => ACCOUNT_LABELS[a]).join(', ')}
            </p>
            <p>
              Mes:{' '}
              {draft.monthMode === MonthMode.MANUAL ? 'Manual' : 'Automático'}
            </p>
            <p>
              Categorías fijas: {draft.enabledFixedCategories.length} de{' '}
              {FIXED_CATEGORIES.length}
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

export function draftToSettingsInput(draft: OnboardingDraft): UpdateSettingsInput {
  return {
    enabledAccounts: draft.enabledAccounts,
    enabledCurrencies: draft.enabledCurrencies,
    enabledFixedCategories: draft.enabledFixedCategories,
    monthMode: draft.monthMode,
    onboardingCompleted: true,
  }
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
          ? 'border-[var(--blue)] bg-[#e8f0fe]'
          : 'border-[var(--border)] bg-white'
      }`}
    >
      <span className="font-semibold">{label}</span>
      {hint && <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p>}
    </button>
  )
}
