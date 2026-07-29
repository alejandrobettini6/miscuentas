import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CATEGORY_LABELS } from '@/constants/categories'
import { CategorySuggestionService } from '@/services/cardStatement/CategorySuggestionService'
import type { ParsedMovement } from '@/services/cardStatement/types'
import { Category } from '@/types/enums'
import { formatMoneyLabel } from '@/utils/formatters'
import {
  isValidCustomCategoryName,
  normalizeCustomCategoryName,
} from '@/validators/amount'
import { useBackButtonClose } from '@/hooks/useBackButtonClose'

export type MovementCategoryChoice =
  | { kind: 'fixed'; category: Category; detail: string | null }
  | { kind: 'custom'; name: string }
  | { kind: 'other'; detail: string | null }
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

function defaultExpenseName(description: string): string {
  return description.slice(0, 40)
}

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
  const [otherExpenseName, setOtherExpenseName] = useState(
    defaultExpenseName(movement.description),
  )
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
    setDetail(defaultExpenseName(movement.description))
    setSelectedFixed(null)
    setOtherExpenseName(defaultExpenseName(movement.description))
    setNewName('')
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

  const confirmOtros = () => {
    setError(null)
    const trimmedNew = newName.trim()
    if (trimmedNew) {
      if (!isValidCustomCategoryName(trimmedNew)) {
        setError('Nombre de categoría inválido (máx. 40 caracteres)')
        return
      }
      onConfirm({
        kind: 'new',
        name: normalizeCustomCategoryName(trimmedNew),
        addToList,
      })
      return
    }

    const trimmedExpense = otherExpenseName.trim()
    let expenseDetail: string | null = null
    if (trimmedExpense) {
      if (!isValidCustomCategoryName(trimmedExpense)) {
        setError('Nombre del gasto inválido (máx. 40 caracteres)')
        return
      }
      expenseDetail = normalizeCustomCategoryName(trimmedExpense)
    }
    onConfirm({ kind: 'other', detail: expenseDetail })
  }

  const suggestionLabel =
    suggestion?.kind === 'fixed'
      ? CATEGORY_LABELS[suggestion.category]
      : suggestion?.kind === 'custom'
        ? suggestion.name
        : null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--overlay)] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Categorizar movimiento"
      onClick={onCancel}
    >
      <div
        className="flex min-w-0 max-h-[92vh] w-full max-w-md flex-col rounded-2xl bg-[var(--surface)] shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-w-0 border-b border-[var(--border)] px-5 pb-3 pt-4">
          <p className="text-xs text-[var(--muted)]">
            Movimiento {index + 1} de {total}
          </p>
          <h2 className="mt-1 break-words text-lg font-semibold leading-snug">
            {movement.description}
          </h2>
          <p className="mt-1 text-base font-medium tabular-nums">
            {formatMoneyLabel(movement.amount, movement.currency)}
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

        <div className="min-w-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
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
                    className="max-w-full break-words rounded-xl border border-[var(--blue)] bg-[var(--fill)] px-3 py-2 text-left text-sm font-medium whitespace-normal text-[var(--blue)] active:bg-[var(--press)] disabled:opacity-50"
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

                {customCategories.length > 0 ? (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {customCategories.map((name) => (
                      <button
                        key={name}
                        type="button"
                        disabled={busy}
                        className="max-w-full break-words rounded-xl border border-[var(--border)] px-3 py-2 text-left text-sm whitespace-normal active:bg-[var(--press)] disabled:opacity-50"
                        onClick={() => confirmCustom(name)}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                ) : null}

                <label className="mb-1 block text-sm text-[var(--muted)]">
                  Nombre del gasto (opcional)
                </label>
                <input
                  type="text"
                  value={otherExpenseName}
                  maxLength={40}
                  disabled={busy}
                  className="mb-4 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-base outline-none focus:border-[var(--blue)]"
                  onChange={(event) => setOtherExpenseName(event.target.value)}
                />

                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Nueva categoría (opcional)
                </p>
                <input
                  type="text"
                  value={newName}
                  maxLength={40}
                  disabled={busy}
                  placeholder="Solo si querés crear otra categoría"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-base outline-none focus:border-[var(--blue)]"
                  onChange={(event) => setNewName(event.target.value)}
                />
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={addToList}
                    disabled={busy || !newName.trim()}
                    onChange={(event) => setAddToList(event.target.checked)}
                  />
                  Agregar a mi lista
                </label>
                <Button
                  className="mt-3 w-full"
                  disabled={busy}
                  onClick={confirmOtros}
                >
                  Confirmar y siguiente
                </Button>
              </div>
            </>
          )}

          {error ? <p className="text-sm text-[var(--red)]">{error}</p> : null}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-[var(--border)] px-5 py-3">
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
