import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
import type { SavingsLocationRow } from '@/types/models'
import { Currency } from '@/types/enums'
import { formatMoneyLabel } from '@/utils/formatters'
import { savingsCurrencyCode } from '@/utils/savingsFormat'
import { formatAmountFromNumber, parseBalanceAmountInput } from '@/validators/amount'
import { AmountInput } from '@/components/ui/AmountInput'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface SavingsLocationListProps {
  rows: SavingsLocationRow[]
  accountingCurrency: Currency
  amountsHidden?: boolean
  busy?: boolean
  onEditBalance: (name: string, amount: number) => Promise<void>
  onRename: (oldName: string, newName: string) => Promise<void>
  onRemove: (name: string) => Promise<void>
  onAdd: (name: string) => Promise<void>
}

export function SavingsLocationList({
  rows,
  accountingCurrency,
  amountsHidden = false,
  busy = false,
  onEditBalance,
  onRename,
  onRemove,
  onAdd,
}: SavingsLocationListProps) {
  const [editTarget, setEditTarget] = useState<SavingsLocationRow | null>(null)
  const [editValue, setEditValue] = useState('')
  const [menuTarget, setMenuTarget] = useState<string | null>(null)
  const [renameTarget, setRenameTarget] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) addInputRef.current?.focus()
  }, [adding])

  const money = (amount: number) =>
    amountsHidden ? '••••••' : formatMoneyLabel(amount, accountingCurrency)

  const openEdit = (row: SavingsLocationRow) => {
    setEditTarget(row)
    setEditValue(formatAmountFromNumber(row.amount))
  }

  const saveEdit = async () => {
    if (!editTarget) return
    const parsed = parseBalanceAmountInput(editValue)
    if (parsed === null) return
    await onEditBalance(editTarget.name, parsed)
    setEditTarget(null)
  }

  const saveRename = async () => {
    if (!renameTarget) return
    await onRename(renameTarget, renameValue)
    setRenameTarget(null)
    setRenameValue('')
    setMenuTarget(null)
  }

  const submitAdd = async () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      setAddError('Ingresá un nombre')
      return
    }
    setAddError(null)
    try {
      await onAdd(trimmed)
      setAdding(false)
      setNewName('')
    } catch (error) {
      setAddError(error instanceof Error ? error.message : 'No se pudo agregar')
    }
  }

  return (
    <>
      <div className="space-y-1">
        {rows.map((row) => (
          <div
            key={row.name}
            className="flex items-center gap-2 rounded-xl bg-[var(--surface-2)] px-3 py-3"
          >
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              disabled={busy}
              onClick={() => openEdit(row)}
            >
              <p className="truncate font-medium">{row.name}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{money(row.amount)}</p>
            </button>
            <button
              type="button"
              className="flex min-h-10 min-w-10 items-center justify-center rounded-xl text-[var(--muted)]"
              aria-label={`Opciones ${row.name}`}
              disabled={busy}
              onClick={() => setMenuTarget(row.name)}
            >
              <MoreHorizontal size={20} />
            </button>
          </div>
        ))}

        {!adding ? (
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] text-[var(--muted)] disabled:opacity-50"
            disabled={busy}
            onClick={() => setAdding(true)}
          >
            <Plus size={18} />
            Agregar cajita
          </button>
        ) : (
          <div className="rounded-xl border border-[var(--border)] p-3">
            <input
              ref={addInputRef}
              type="text"
              maxLength={40}
              value={newName}
              disabled={busy}
              placeholder="Nombre (ej. Wallbit)"
              className="min-h-11 w-full rounded-xl border border-[var(--border)] px-3 text-base outline-none focus:border-[var(--blue)]"
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void submitAdd()
              }}
            />
            {addError && <p className="mt-2 text-sm text-[var(--red)]">{addError}</p>}
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                disabled={busy}
                onClick={() => {
                  setAdding(false)
                  setNewName('')
                  setAddError(null)
                }}
              >
                Cancelar
              </Button>
              <Button className="flex-1" disabled={busy} onClick={() => void submitAdd()}>
                Agregar
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={editTarget !== null}
        title={
          editTarget
            ? `${editTarget.name} — ${savingsCurrencyCode(accountingCurrency)}`
            : 'Editar monto'
        }
        onClose={() => setEditTarget(null)}
      >
        <AmountInput
          value={editValue}
          onChange={setEditValue}
          className="min-h-14 w-full rounded-xl border border-[var(--border)] px-4 text-center text-3xl outline-none focus:border-[var(--blue)]"
          aria-label="Monto de la cajita"
        />
        <div className="mt-4 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setEditTarget(null)}>
            Cancelar
          </Button>
          <Button className="flex-1" disabled={busy} onClick={() => void saveEdit()}>
            Guardar
          </Button>
        </div>
      </Modal>

      <Modal
        open={menuTarget !== null}
        title={menuTarget ?? 'Cajita'}
        onClose={() => setMenuTarget(null)}
      >
        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              if (!menuTarget) return
              setRenameTarget(menuTarget)
              setRenameValue(menuTarget)
              setMenuTarget(null)
            }}
          >
            Renombrar
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              if (!menuTarget) return
              void onRemove(menuTarget).then(() => setMenuTarget(null))
            }}
          >
            Eliminar
          </Button>
        </div>
      </Modal>

      <Modal
        open={renameTarget !== null}
        title="Renombrar cajita"
        onClose={() => setRenameTarget(null)}
      >
        <input
          type="text"
          maxLength={40}
          value={renameValue}
          className="min-h-11 w-full rounded-xl border border-[var(--border)] px-3 text-base outline-none focus:border-[var(--blue)]"
          onChange={(event) => setRenameValue(event.target.value)}
        />
        <div className="mt-4 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setRenameTarget(null)}>
            Cancelar
          </Button>
          <Button className="flex-1" disabled={busy} onClick={() => void saveRename()}>
            Guardar
          </Button>
        </div>
      </Modal>
    </>
  )
}
