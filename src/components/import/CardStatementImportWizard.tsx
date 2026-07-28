import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  StatementMovementSheet,
  type MovementCategoryChoice,
} from '@/components/import/StatementMovementSheet'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ACCOUNT_LABELS, CATEGORY_LABELS } from '@/constants/categories'
import { useSettingsContext } from '@/contexts/SettingsContext'
import {
  extractPdfText,
  PdfExtractError,
  pdfExtractErrorMessage,
} from '@/services/cardStatement/pdfExtract'
import {
  parseWithBank,
} from '@/services/cardStatement/registry'
import { yearHintFromYearMonth } from '@/services/cardStatement/parseAmount'
import type { ParsedMovement } from '@/services/cardStatement/types'
import { AccountType, Category } from '@/types/enums'
import type { CreateExpenseInput, Period, Settings } from '@/types/models'
import { formatMoneyLabel } from '@/utils/formatters'
import { getErrorMessage } from '@/utils/errors'
import {
  isValidCustomCategoryName,
  normalizeCustomCategoryName,
} from '@/validators/amount'

type WizardStep =
  | 'mode'
  | 'upload'
  | 'preview'
  | 'categorize'
  | 'done'

type ImportMode = 'manual' | 'automatic'

interface PreviewRow {
  id: string
  movement: ParsedMovement
  included: boolean
}

interface CardStatementImportWizardProps {
  open: boolean
  period: Period | null
  readOnly: boolean
  settings: Settings
  onClose: () => void
  createExpense: (input: CreateExpenseInput) => Promise<unknown>
  updateSettings: (input: { customCategories: string[] }) => Promise<unknown>
}

export function CardStatementImportWizard({
  open,
  period,
  readOnly,
  settings,
  onClose,
  createExpense,
  updateSettings,
}: CardStatementImportWizardProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<WizardStep>('mode')
  const [mode, setMode] = useState<ImportMode>('manual')
  const [password, setPassword] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [queue, setQueue] = useState<ParsedMovement[]>([])
  const [queueIndex, setQueueIndex] = useState(0)
  const [createdCount, setCreatedCount] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)
  const [sheetBusy, setSheetBusy] = useState(false)

  const { settings: liveSettings } = useSettingsContext()
  const effectiveSettings = liveSettings ?? settings

  const enabledFixed = useMemo(
    () =>
      effectiveSettings.enabledFixedCategories.filter(
        (c) => c !== Category.OTHER,
      ),
    [effectiveSettings.enabledFixedCategories],
  )

  const reset = () => {
    setStep('mode')
    setMode('manual')
    setPassword('')
    setSelectedFile(null)
    setBusy(false)
    setError(null)
    setRows([])
    setQueue([])
    setQueueIndex(0)
    setCreatedCount(0)
    setSkippedCount(0)
    setSheetBusy(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  useEffect(() => {
    if (!open) reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on close/open flip handled via open
  }, [open])

  if (!open) return null

  const periodLabel = period?.label ?? 'sin período'
  const contextLine = `Se cargarán en ${ACCOUNT_LABELS[AccountType.WHITE]} · ${periodLabel}`

  const blockedReason = readOnly
    ? !period
      ? 'No hay un período activo para cargar movimientos.'
      : 'El período seleccionado está cerrado. Elegí un mes activo para importar.'
    : null

  const applyMercadoPago = (text: string) => {
    const yearHint = yearHintFromYearMonth(period?.yearMonth)
    const movements = parseWithBank(text, 'mercadopago', { yearHint })
    setRows(
      movements.map((movement, index) => ({
        id: `${index}-${movement.description}-${movement.amount}`,
        movement,
        included: true,
      })),
    )
    setStep('preview')
  }

  const handleFile = async (file: File | null) => {
    if (!file || blockedReason) return
    setBusy(true)
    setError(null)
    try {
      const buffer = await file.arrayBuffer()
      const text = await extractPdfText(buffer, password)
      applyMercadoPago(text)
    } catch (err) {
      if (err instanceof PdfExtractError) {
        setError(err.message)
        if (
          err.code === 'PASSWORD_REQUIRED' ||
          err.code === 'WRONG_PASSWORD'
        ) {
          toast.error(err.message)
        }
      } else {
        setError(pdfExtractErrorMessage(err))
      }
    } finally {
      setBusy(false)
    }
  }

  const startCategorize = () => {
    const selected = rows.filter((r) => r.included).map((r) => r.movement)
    if (selected.length === 0) {
      toast.error('Seleccioná al menos un movimiento')
      return
    }
    setQueue(selected)
    setQueueIndex(0)
    setCreatedCount(0)
    setSkippedCount(0)
    setStep('categorize')
  }

  const advanceQueue = (skipped: boolean) => {
    const nextIndex = queueIndex + 1
    const nextCreated = createdCount + (skipped ? 0 : 1)
    const nextSkipped = skippedCount + (skipped ? 1 : 0)
    setCreatedCount(nextCreated)
    setSkippedCount(nextSkipped)
    if (nextIndex >= queue.length) {
      setStep('done')
      return
    }
    setQueueIndex(nextIndex)
  }

  const ensureCustomCategory = async (name: string) => {
    const lower = name.toLowerCase()
    const fixedLabels = Object.values(CATEGORY_LABELS).map((l) =>
      l.toLowerCase(),
    )
    if (fixedLabels.includes(lower)) {
      throw new Error('Esa categoría ya existe como fija')
    }
    const existing = effectiveSettings.customCategories.map((c) =>
      c.toLowerCase(),
    )
    if (!existing.includes(lower)) {
      await updateSettings({
        customCategories: [...effectiveSettings.customCategories, name],
      })
    }
  }

  const handleConfirm = async (choice: MovementCategoryChoice) => {
    if (!period || sheetBusy) return
    const movement = queue[queueIndex]
    if (!movement) return

    setSheetBusy(true)
    try {
      let category: Category
      let description: string | null = null

      if (choice.kind === 'fixed') {
        category = choice.category
        description = choice.detail
      } else if (choice.kind === 'custom') {
        category = Category.OTHER
        description = choice.name
      } else if (choice.kind === 'other') {
        category = Category.OTHER
        description = null
      } else {
        if (!isValidCustomCategoryName(choice.name)) {
          throw new Error('Nombre inválido')
        }
        const name = normalizeCustomCategoryName(choice.name)
        if (choice.addToList) {
          await ensureCustomCategory(name)
        }
        category = Category.OTHER
        description = name
      }

      await createExpense({
        periodId: period.id,
        accountType: AccountType.WHITE,
        category,
        description,
        originalAmount: movement.amount,
        originalCurrency: movement.currency,
      })
      advanceQueue(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo registrar el movimiento'))
    } finally {
      setSheetBusy(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const currentMovement = queue[queueIndex] ?? null
  const includedCount = rows.filter((r) => r.included).length

  return (
    <>
      <Modal
        open={step !== 'categorize'}
        title="Importar resumen de tarjeta"
        onClose={handleClose}
      >
        <p className="mb-4 text-sm text-[var(--muted)]">{contextLine}</p>

        {blockedReason ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--red)]">{blockedReason}</p>
            <Button variant="secondary" className="w-full" onClick={handleClose}>
              Cerrar
            </Button>
          </div>
        ) : null}

        {!blockedReason && step === 'mode' ? (
          <div className="space-y-3">
            <button
              type="button"
              className={`w-full rounded-xl border p-4 text-left transition ${
                mode === 'manual'
                  ? 'border-[var(--blue)] bg-[var(--fill)]'
                  : 'border-[var(--border)]'
              }`}
              onClick={() => setMode('manual')}
            >
              <p className="font-medium">Análisis manual</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Recomendado. Revisás cada movimiento y elegís la categoría.
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Por ahora solo se admiten resúmenes de{' '}
                <span className="font-medium text-[var(--text)]">
                  Mercado Pago
                </span>
                . Otros bancos no están soportados.
              </p>
            </button>
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-[var(--border)] p-4 text-left opacity-50"
              aria-disabled="true"
            >
              <p className="font-medium">Agregado automático</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Próximamente. Sugerencias de categoría y carga en lote.
              </p>
            </button>
            <Button
              className="w-full"
              disabled={mode !== 'manual'}
              onClick={() => setStep('upload')}
            >
              Continuar
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleClose}>
              Cancelar
            </Button>
          </div>
        ) : null}

        {!blockedReason && step === 'upload' ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-[var(--muted)]">
                Archivo PDF del resumen
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,.pdf"
                disabled={busy}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  setSelectedFile(file)
                  setError(null)
                }}
              />
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                Elegir PDF
              </Button>
              <p className="mt-2 truncate text-sm text-[var(--muted)]">
                {selectedFile ? selectedFile.name : 'Ningún archivo'}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm text-[var(--muted)]">
                Contraseña (opcional)
              </label>
              <input
                type="password"
                value={password}
                disabled={busy}
                autoComplete="off"
                placeholder="Si el PDF está protegido"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-base outline-none focus:border-[var(--blue)]"
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-[var(--red)]">{error}</p> : null}
            {busy ? (
              <p className="text-sm text-[var(--muted)]">Leyendo PDF…</p>
            ) : null}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                disabled={busy}
                onClick={() => setStep('mode')}
              >
                Atrás
              </Button>
              <Button
                className="flex-1"
                disabled={busy || !selectedFile}
                onClick={() => void handleFile(selectedFile)}
              >
                Aceptar
              </Button>
            </div>
            <Button
              variant="ghost"
              className="w-full"
              disabled={busy}
              onClick={handleClose}
            >
              Cancelar
            </Button>
          </div>
        ) : null}

        {!blockedReason && step === 'preview' ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Mercado Pago</p>
              <p className="text-xs text-[var(--muted)]">
                {includedCount} de {rows.length} seleccionados
              </p>
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-[var(--red)]">
                No se encontraron movimientos. Revisá que sea un resumen de
                Mercado Pago con texto seleccionable.
              </p>
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {rows.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-start gap-3 rounded-xl border border-[var(--border)] px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={row.included}
                      onChange={() => {
                        setRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id
                              ? { ...r, included: !r.included }
                              : r,
                          ),
                        )
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {row.movement.description}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {row.movement.date ?? 'sin fecha'}
                        {row.movement.installment
                          ? ` · Cuota ${row.movement.installment}`
                          : ''}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm tabular-nums">
                      {formatMoneyLabel(
                        row.movement.amount,
                        row.movement.currency,
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setStep('upload')}
              >
                Atrás
              </Button>
              <Button
                className="flex-1"
                disabled={includedCount === 0}
                onClick={startCategorize}
              >
                Categorizar
              </Button>
            </div>
          </div>
        ) : null}

        {!blockedReason && step === 'done' ? (
          <div className="space-y-4">
            <p className="text-sm">
              Listo. Se cargaron <strong>{createdCount}</strong> movimientos
              {skippedCount > 0 ? (
                <>
                  {' '}
                  y se omitieron <strong>{skippedCount}</strong>
                </>
              ) : null}
              .
            </p>
            <Button className="w-full" onClick={handleClose}>
              Cerrar
            </Button>
          </div>
        ) : null}
      </Modal>

      {step === 'categorize' && currentMovement ? (
        <StatementMovementSheet
          open
          movement={currentMovement}
          index={queueIndex}
          total={queue.length}
          enabledFixedCategories={enabledFixed}
          customCategories={effectiveSettings.customCategories}
          busy={sheetBusy}
          onConfirm={(choice) => void handleConfirm(choice)}
          onSkip={() => advanceQueue(true)}
          onCancel={handleClose}
        />
      ) : null}
    </>
  )
}
