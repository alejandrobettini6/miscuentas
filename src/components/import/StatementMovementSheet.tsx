import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CATEGORY_LABELS } from '@/constants/categories'
import { CategorySuggestionService } from '@/services/cardStatement/CategorySuggestionService'
import type { ParsedMovement } from '@/services/cardStatement/types'
import { Category, Currency } from '@/types/enums'
import { formatMoneyLabel } from '@/utils/formatters'
import {
  isValidCustomCategoryName,
  normalizeCustomCategoryName,
} from '@/validators/amount'
import { useBackButtonClose } from '@/hooks/useBackButtonClose'

export type MovementCategoryChoice =
  | { kind: 'fixed'; category: Category; detail: string | null }
  | { kind: 'custom'; name: string }
  | { kind: 'other' }
  | { kind: 'new'; name: string; addToList: boolean }

interface StatementMovementSheetProps {
  open: boolean
  movement: ParsedMovement
  index: number
  total: number
  enabledFixedCategories: Category[]
  customCategories: string[]
  busy?: boolean
  onConfirm: (choice: MovementCategoryChoice) => void
  onSkip: () => void
  onCancel: () => void
}

type Panel = 'main' | 'otros'

export function StatementMovementSheet({
  open,
  movement,
  index,
  total,
  enabledFixedCategories,
  customCategories,
  busy = false,
  onConfirm,
  onSkip,
  onCancel,
}: StatementMovementSheetProps) {
  const [panel, setPanel] = useState<Panel>('main')
  const [detail, setDetail] = useState(movement.description)
  const [selectedFixed, setSelectedFixed] = useState<Category | null>(null)
  const [newName, setNewName] = useState('')
  const [addToList, setAddToList] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const suggestion = useMemo(
    () => CategorySuggestionService.suggest(movement.description),
    [movement.description],
  )

  useEffect(() => {
    if (!open) return
    setPanel('main')
    setDetail(movement.description.slice(0, 40))
    setSelectedFixed(null)
    setNewName(movement.description.slice(0, 40))
    setAddToList(true)
    setError(null)
  }, [open, movement])

  useBackButtonClose(open, () => {
    if (panel === 'otros') {
      setPanel('main')
      return
    }
    onCancel()
  })

  if (!open) return null

  const confirmFixed = (category: Category) => {
    const trimmed = detail.trim()
    let detailValue: string | null = null
    if (trimmed) {
      if (!isValidCustomCategoryName(trimmed)) {
        setError('Detalle inválido (máx. 40 caracteres)')
        return
      }
      detailValue = normalizeCustomCategoryName(trimmed)
    }
    onConfirm({ kind: 'fixed', category, detail: detailValue })
  }

  const confirmCustom = (name: string) => {
    onConfirm({ kind: 'custom', name: normalizeCustomCategoryName(name) })
  }

  const confirmNew = () => {
    if (!isValidCustomCategoryName(newName)) {
      setError('Nombre inválido (máx. 40 caracteres)')
      return
    }
    onConfirm({
      kind: 'new',
      name: normalizeCustomCategoryName(newName),
      addToList,
    })
  }

  const suggestionLabel =
    suggestion?.kind === 'fixed'
      ? CATEGORY_LABELS[suggestion.category]
      : suggestion?.kind === 'custom'
        ? suggestion.name
        : null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[var(--overlay)] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Categorizar movimiento"
      onClick={onCancel}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-2xl bg-[var(--surface)] shadow-lg sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[var(--border)] px-5 pb-3 pt-4">
          <p className="text-xs text-[var(--muted)]">
            Movimiento {index + 1} de {total}
          </p>
          <h2 className="mt-1 text-lg font-semibold leading-snug">
            {movement.description}
          </h2>
          <p className="mt-1 text-base font-medium tabular-nums">
            {formatMoneyLabel(movement.amount, movement.currency)}
            {movement.currency === Currency.USD ? '' : ''}
            {movement.installment ? (
              <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                Cuota {movement.installment}
              </span>
            ) : null}
            {movement.date ? (
              <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                {movement.date}
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {panel === 'main' ? (
            <>
              {suggestionLabel ? (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Sugerido
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-xl border border-[var(--blue)] bg-[var(--fill)] px-3 py-2 text-sm font-medium text-[var(--blue)] active:bg-[var(--press)] disabled:opacity-50"
                    onClick={() => {
                      if (suggestion?.kind === 'fixed') {
                        setSelectedFixed(suggestion.category)
                        confirmFixed(suggestion.category)
                      } else if (suggestion?.kind === 'custom') {
                        confirmCustom(suggestion.name)
                      }
                    }}
                  >
                    {suggestionLabel}
                  </button>
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Categoría
                </p>
                <div className="flex flex-wrap gap-2">
                  {enabledFixedCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      disabled={busy}
                      className={`rounded-xl border px-3 py-2 text-sm active:bg-[var(--press)] disabled:opacity-50 ${
                        selectedFixed === category
                          ? 'border-[var(--blue)] bg-[var(--fill)] text-[var(--blue)]'
                          : 'border-[var(--border)] text-[var(--text)]'
                      }`}
                      onClick={() => {
                        setSelectedFixed(category)
                        setError(null)
                      }}
                    >
                      {CATEGORY_LABELS[category]}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm active:bg-[var(--press)] disabled:opacity-50"
                    onClick={() => {
                      setPanel('otros')
                      setError(null)
                    }}
                  >
                    {CATEGORY_LABELS[Category.OTHER]}
                  </button>
                </div>
              </div>

              {selectedFixed ? (
                <div>
                  <label className="mb-1 block text-sm text-[var(--muted)]">
                    Detalle (opcional)
                  </label>
                  <input
                    type="text"
                    value={detail}
                    maxLength={40}
                    disabled={busy}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-base outline-none focus:border-[var(--blue)]"
                    onChange={(event) => setDetail(event.target.value)}
                  />
                  <Button
                    className="mt-3 w-full"
                    disabled={busy}
                    onClick={() => confirmFixed(selectedFixed)}
                  >
                    Confirmar y siguiente
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <button
                type="button"
                className="text-sm text-[var(--blue)]"
                onClick={() => setPanel('main')}
                disabled={busy}
              >
                ← Volver
              </button>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Otros
                </p>
                <button
                  type="button"
                  disabled={busy}
                  className="mb-3 w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-left text-sm active:bg-[var(--press)] disabled:opacity-50"
                  onClick={() => onConfirm({ kind: 'other' })}
                >
                  Otros (sin nombre)
                </button>

                {customCategories.length > 0 ? (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {customCategories.map((name) => (
                      <button
                        key={name}
                        type="button"
                        disabled={busy}
                        className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm active:bg-[var(--press)] disabled:opacity-50"
                        onClick={() => confirmCustom(name)}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                ) : null}

                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Nueva categoría
                </p>
                <input
                  type="text"
                  value={newName}
                  maxLength={40}
                  disabled={busy}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-base outline-none focus:border-[var(--blue)]"
                  onChange={(event) => setNewName(event.target.value)}
                />
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={addToList}
                    disabled={busy}
                    onChange={(event) => setAddToList(event.target.checked)}
                  />
                  Agregar a mi lista
                </label>
                <Button
                  className="mt-3 w-full"
                  disabled={busy || !newName.trim()}
                  onClick={confirmNew}
                >
                  Confirmar y siguiente
                </Button>
              </div>
            </>
          )}

          {error ? <p className="text-sm text-[var(--red)]">{error}</p> : null}
        </div>

        <div className="flex gap-2 border-t border-[var(--border)] px-5 py-3">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={busy}
            onClick={onSkip}
          >
            Omitir
          </Button>
          <Button
            variant="ghost"
            className="flex-1"
            disabled={busy}
            onClick={onCancel}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
