import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuthContext } from '@/contexts/AuthContext'
import { useSettingsContext } from '@/contexts/SettingsContext'
import { getImportRepository } from '@/repositories'
import { ExportService } from '@/services/ExportService'
import { ImportService } from '@/services/ImportService'
import type { Expense, Period } from '@/types/models'
import type { NormalizedImportPayload } from '@/repositories/interfaces'
import { getErrorMessage } from '@/utils/errors'

interface ImportAccountsModalProps {
  open: boolean
  expenses: Expense[]
  periods: Period[]
  onClose: () => void
  onImported: () => Promise<void>
}

export function ImportAccountsModal({
  open,
  expenses,
  periods,
  onClose,
  onImported,
}: ImportAccountsModalProps) {
  const { user } = useAuthContext()
  const { settings, refresh } = useSettingsContext()
  const inputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [preview, setPreview] = useState<NormalizedImportPayload | null>(null)
  const [backupDone, setBackupDone] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const reset = () => {
    setErrors([])
    setPreview(null)
    setBackupDone(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFile = async (file: File | null) => {
    if (!file || !user) return
    const text = await file.text()
    const result = ImportService.parseAndValidate(text, user.id)
    if (!result.ok || !result.payload) {
      setPreview(null)
      setErrors(result.errors)
      toast.error('Archivo rechazado')
      return
    }
    setErrors([])
    setPreview(result.payload)
  }

  const exportBackup = () => {
    if (!settings) return
    ExportService.download(
      'miscuentas-backup-antes-importar.json',
      ExportService.toJson(expenses, settings, periods),
      'application/json',
    )
    setBackupDone(true)
  }

  const confirmImport = async () => {
    if (!user || !preview || !backupDone) return
    setBusy(true)
    try {
      await getImportRepository().replaceAll(user.id, preview)
      await refresh()
      await onImported()
      toast.success('Cuentas importadas')
      reset()
      onClose()
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo importar'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Importar cuentas"
      onClose={() => {
        reset()
        onClose()
      }}
    >
      <div className="space-y-4">
        <div className="rounded-xl border-2 border-[var(--red)] bg-[#ffe5e5] p-4 text-[var(--red)]">
          <p className="font-bold">Reemplazo total</p>
          <p className="mt-2 text-sm">
            Un JSON válido reemplaza toda la información de la cuenta. Exportá un
            respaldo antes de continuar.
          </p>
        </div>

        <Button className="w-full" variant="secondary" onClick={exportBackup}>
          Exportar JSON de respaldo
        </Button>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={backupDone}
            onChange={(e) => setBackupDone(e.target.checked)}
          />
          <span>Ya guardé el JSON de respaldo</span>
        </label>

        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="block w-full text-sm"
          onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
        />

        {errors.length > 0 && (
          <div className="rounded-xl bg-[#ffe5e5] p-3 text-sm text-[var(--red)]">
            <p className="font-semibold">Errores de validación</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {preview && (
          <div className="rounded-xl bg-[#f2f2f7] p-3 text-sm">
            <p className="font-semibold">Vista previa</p>
            <p>Versión: {preview.source.version}</p>
            <p>Períodos: {preview.periods.length}</p>
            <p>Movimientos: {preview.expenses.length}</p>
            <p>
              Las opciones deshabilitadas en tu configuración seguirán ocultando
              esos movimientos (se conservan).
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={busy}
            onClick={() => {
              reset()
              onClose()
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={busy || !preview || !backupDone}
            onClick={() => void confirmImport()}
          >
            Reemplazar todo
          </Button>
        </div>
      </div>
    </Modal>
  )
}
