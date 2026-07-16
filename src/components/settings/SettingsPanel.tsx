import { useState } from 'react'
import { X } from 'lucide-react'
import {
  ACCOUNT_LABELS,
  CATEGORY_LABELS,
  CURRENCY_LABELS,
  FIXED_CATEGORIES,
} from '@/constants/categories'
import { useSettingsContext } from '@/contexts/SettingsContext'
import {
  needsExchangeRates,
  resolveAccountingCurrency,
  shouldShowUsdCashRate,
  shouldShowUsdWhiteRate,
} from '@/services/AccountingCurrency'
import { AccountType, Category, Currency, MonthMode } from '@/types/enums'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import toast from 'react-hot-toast'
import { getErrorMessage } from '@/utils/errors'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  onOpenOnboarding: () => void
}

export function SettingsPanel({
  open,
  onClose,
  onOpenOnboarding,
}: SettingsPanelProps) {
  const { settings, updateSettings } = useSettingsContext()
  const [busy, setBusy] = useState(false)

  if (!open || !settings) return null

  const toggleAccount = async (account: AccountType) => {
    const has = settings.enabledAccounts.includes(account)
    const next = has
      ? settings.enabledAccounts.filter((a) => a !== account)
      : [...settings.enabledAccounts, account]
    if (next.length === 0) {
      toast.error('Debés dejar al menos una cuenta')
      return
    }
    setBusy(true)
    try {
      await updateSettings({ enabledAccounts: next })
      toast.success('Configuración actualizada')
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo guardar'))
    } finally {
      setBusy(false)
    }
  }

  const toggleCurrency = async (currency: Currency) => {
    const has = settings.enabledCurrencies.includes(currency)
    const next = has
      ? settings.enabledCurrencies.filter((c) => c !== currency)
      : [...settings.enabledCurrencies, currency]
    if (next.length === 0) {
      toast.error('Debés dejar al menos una moneda')
      return
    }
    setBusy(true)
    try {
      await updateSettings({ enabledCurrencies: next })
      toast.success('Configuración actualizada')
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo guardar'))
    } finally {
      setBusy(false)
    }
  }

  const toggleCategory = async (category: Category) => {
    const has = settings.enabledFixedCategories.includes(category)
    const next = has
      ? settings.enabledFixedCategories.filter((c) => c !== category)
      : [...settings.enabledFixedCategories, category]
    setBusy(true)
    try {
      await updateSettings({ enabledFixedCategories: next })
      toast.success('Configuración actualizada')
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo guardar'))
    } finally {
      setBusy(false)
    }
  }

  const setMonthMode = async (monthMode: MonthMode) => {
    setBusy(true)
    try {
      await updateSettings({ monthMode })
      toast.success('Modo de mes actualizado')
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo guardar'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-[min(100%,360px)] flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-lg font-semibold">Configuración</h2>
          <button
            type="button"
            className="flex min-h-11 min-w-11 items-center justify-center"
            aria-label="Cerrar configuración"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          <section>
            <Tooltip text="Deshabilitar una moneda la oculta al registrar y en el resumen. Los movimientos se conservan y reaparecen al reactivarla. Con solo pesos, no hay conversión a dólares.">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                Monedas
              </h3>
            </Tooltip>
            <div className="space-y-2 rounded-2xl bg-[#f2f2f7] p-3">
              {[Currency.ARS, Currency.USD].map((currency) => (
                <label key={currency} className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={settings.enabledCurrencies.includes(currency)}
                    onChange={() => void toggleCurrency(currency)}
                  />
                  {CURRENCY_LABELS[currency]} ({currency})
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Límite mensual en{' '}
              {resolveAccountingCurrency(settings) === Currency.ARS ? 'ARS' : 'USD'}.
              {needsExchangeRates(settings)
                ? ' Las cotizaciones USD se configuran en el menú hamburguesa.'
                : ' No se usan cotizaciones USD con esta configuración.'}
            </p>
            {needsExchangeRates(settings) && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                Se muestran:{' '}
                {[
                  shouldShowUsdWhiteRate(settings) ? 'USD Blanco' : null,
                  shouldShowUsdCashRate(settings) ? 'USD Negro' : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'ninguna (habilitá una cuenta)'}
              </p>
            )}
          </section>

          <section>
            <Tooltip text="Blanco y Negro son cuentas separadas. Si deshabilitás una, deja de mostrarse en el dashboard y reportes, sin borrar movimientos.">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                Cuentas
              </h3>
            </Tooltip>
            <div className="space-y-2 rounded-2xl bg-[#f2f2f7] p-3">
              {[AccountType.WHITE, AccountType.CASH].map((account) => (
                <label key={account} className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={settings.enabledAccounts.includes(account)}
                    onChange={() => void toggleAccount(account)}
                  />
                  {ACCOUNT_LABELS[account]}
                </label>
              ))}
            </div>
          </section>

          <section>
            <Tooltip text="Automático crea un mes nuevo al cambiar el calendario. Manual te pide cerrar el mes. El historial queda en solo lectura.">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                Cambio de mes
              </h3>
            </Tooltip>
            <div className="space-y-2 rounded-2xl bg-[#f2f2f7] p-3">
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="radio"
                  name="month-mode"
                  disabled={busy}
                  checked={settings.monthMode === MonthMode.MANUAL}
                  onChange={() => void setMonthMode(MonthMode.MANUAL)}
                />
                Manual (recomendado)
              </label>
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="radio"
                  name="month-mode"
                  disabled={busy}
                  checked={settings.monthMode === MonthMode.AUTOMATIC}
                  onChange={() => void setMonthMode(MonthMode.AUTOMATIC)}
                />
                Automático
              </label>
            </div>
          </section>

          <section>
            <Tooltip text="Las categorías desmarcadas se ocultan. Sus movimientos no se borran y vuelven al reactivarlas.">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                Categorías fijas
              </h3>
            </Tooltip>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl bg-[#f2f2f7] p-3">
              {FIXED_CATEGORIES.map((category) => (
                <label key={category} className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={settings.enabledFixedCategories.includes(category)}
                    onChange={() => void toggleCategory(category)}
                  />
                  {CATEGORY_LABELS[category]}
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Autoconfiguración
            </h3>
            <p className="mb-3 text-sm text-[var(--muted)]">
              Volvé a responder las preguntas del onboarding. Se pedirá exportar JSON
              antes de continuar.
            </p>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                onClose()
                onOpenOnboarding()
              }}
            >
              Preguntas para autoconfigurar mi perfil
            </Button>
          </section>
        </div>
      </aside>
    </>
  )
}
