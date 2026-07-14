import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useSettingsContext } from '@/contexts/SettingsContext'
import { ExportService } from '@/services/ExportService'
import type { Expense } from '@/types/models'
import {
  formatAmountFromNumber,
  isValidExchangeRate,
  isValidMonthlyLimit,
  parseAmountInput,
} from '@/validators/amount'
import { AmountInput } from '@/components/ui/AmountInput'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { getErrorMessage } from '@/utils/errors'

interface SideMenuProps {
  open: boolean
  expenses: Expense[]
  onClose: () => void
  onResetMonth: () => Promise<void>
}

type SettingField = 'usdWhite' | 'usdCash' | 'monthlyLimit' | null

export function SideMenu({ open, expenses, onClose, onResetMonth }: SideMenuProps) {
  const { logout } = useAuthContext()
  const { settings, updateSettings } = useSettingsContext()
  const [activeField, setActiveField] = useState<SettingField>(null)
  const [fieldValue, setFieldValue] = useState('')
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (activeField) {
      window.setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [activeField])

  if (!open) return null

  const openField = (field: Exclude<SettingField, null>) => {
    if (!settings) return
    const value =
      field === 'usdWhite'
        ? settings.usdWhite
        : field === 'usdCash'
          ? settings.usdCash
          : settings.monthlyLimit
    setFieldValue(formatAmountFromNumber(value))
    setActiveField(field)
  }

  const saveField = async () => {
    if (!activeField) return
    const parsed = parseAmountInput(fieldValue)
    const field = activeField
    setActiveField(null)

    if (parsed === null) {
      toast.error('Valor inválido')
      return
    }

    try {
      if (field === 'monthlyLimit') {
        if (!isValidMonthlyLimit(parsed)) throw new Error('Límite inválido')
        await updateSettings({ monthlyLimit: parsed })
      } else if (field === 'usdWhite') {
        if (!isValidExchangeRate(parsed)) throw new Error('Cotización inválida')
        await updateSettings({ usdWhite: parsed })
      } else {
        if (!isValidExchangeRate(parsed)) throw new Error('Cotización inválida')
        await updateSettings({ usdCash: parsed })
      }
      toast.success('Guardado')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Error al guardar'))
    }
  }

  const exportCsv = () => {
    if (!settings) return
    ExportService.download(
      'miscuentas.csv',
      ExportService.toCsv(expenses),
      'text/csv;charset=utf-8',
    )
  }

  const exportLogs = () => {
    ExportService.download(
      'miscuentas-logs.csv',
      ExportService.toLogs(expenses),
      'text/csv;charset=utf-8',
    )
  }

  const exportJson = () => {
    if (!settings) return
    ExportService.download(
      'miscuentas.json',
      ExportService.toJson(expenses, settings),
      'application/json',
    )
  }

  const confirmReset = async () => {
    try {
      await onResetMonth()
      setResetStep(0)
      onClose()
      toast.success('Mes reiniciado')
    } catch {
      toast.error('No se pudo reiniciar el mes')
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(100%,320px)] flex-col bg-white shadow-xl transition-transform">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-lg font-semibold">Menú</h2>
          <button
            type="button"
            className="flex min-h-11 min-w-11 items-center justify-center"
            aria-label="Cerrar menú"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <Section title="General">
            <MenuButton label="USD Blanco" onClick={() => openField('usdWhite')} />
            <MenuButton label="USD Barrani" onClick={() => openField('usdCash')} />
            <MenuButton label="Límite mensual" onClick={() => openField('monthlyLimit')} />
          </Section>

          <Section title="Datos">
            <MenuButton label="Exportar CSV" onClick={exportCsv} />
            <MenuButton label="Exportar movimientos" onClick={exportLogs} />
            <MenuButton label="Exportar JSON" onClick={exportJson} />
          </Section>

          <Section title="Peligro" danger>
            <MenuButton label="Reset Mes" danger onClick={() => setResetStep(1)} />
          </Section>

          <Button
            variant="secondary"
            className="mt-6 w-full"
            onClick={() => void logout()}
            aria-label="Cerrar sesión"
          >
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <Modal
        open={activeField !== null}
        title={
          activeField === 'usdWhite'
            ? 'USD Blanco'
            : activeField === 'usdCash'
              ? 'USD Barrani'
              : 'Límite mensual'
        }
        onClose={() => setActiveField(null)}
      >
        <AmountInput
          ref={inputRef}
          value={fieldValue}
          onChange={setFieldValue}
          onBlur={() => void saveField()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }
          }}
          className="min-h-14 w-full rounded-xl border border-[var(--border)] px-4 text-center text-3xl outline-none focus:border-[var(--blue)]"
          aria-label="Valor"
        />
      </Modal>

      <Modal open={resetStep === 1} title="Reset Mes" onClose={() => setResetStep(0)}>
        <p className="mb-4 text-[var(--muted)]">
          ¿Seguro que querés eliminar todos los movimientos?
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setResetStep(0)}>
            No
          </Button>
          <Button variant="danger" className="flex-1" onClick={() => setResetStep(2)}>
            Sí
          </Button>
        </div>
      </Modal>

      <Modal open={resetStep === 2} title="Confirmación final" onClose={() => setResetStep(0)}>
        <p className="mb-4 text-[var(--muted)]">
          Esta acción no se puede deshacer. ¿Confirmás el reset?
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setResetStep(0)}>
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1" onClick={() => void confirmReset()}>
            Confirmar
          </Button>
        </div>
      </Modal>
    </>
  )
}

function Section({
  title,
  children,
  danger,
}: {
  title: string
  children: ReactNode
  danger?: boolean
}) {
  return (
    <section className={`mb-6 ${danger ? 'rounded-2xl border border-[var(--red)]/30 p-3' : ''}`}>
      <h3
        className={`mb-2 text-sm font-semibold uppercase tracking-wide ${
          danger ? 'text-[var(--red)]' : 'text-[var(--muted)]'
        }`}
      >
        {title}
      </h3>
      <div className="overflow-hidden rounded-2xl bg-[#f2f2f7]">{children}</div>
    </section>
  )
}

function MenuButton({
  label,
  onClick,
  danger,
}: {
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      className={`flex min-h-12 w-full items-center border-b border-white/70 px-4 text-left text-base last:border-b-0 ${
        danger ? 'font-semibold text-[var(--red)]' : 'text-[var(--text)]'
      }`}
      onClick={onClick}
      aria-label={label}
    >
      {label}
    </button>
  )
}
