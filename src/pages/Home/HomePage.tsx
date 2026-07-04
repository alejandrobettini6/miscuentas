import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { CategoryRow } from '@/components/expenses/CategoryRow'
import { Header } from '@/components/layout/Header'
import { SideMenu } from '@/components/layout/SideMenu'
import { UndoBar, createUndoDeadline } from '@/components/layout/UndoBar'
import { MonthlySummaryCard } from '@/components/summary/MonthlySummaryCard'
import { AmountSheet } from '@/components/ui/AmountSheet'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { useExpenses } from '@/hooks/useExpenses'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSummary } from '@/hooks/useSummary'
import { useSettingsContext } from '@/contexts/SettingsContext'
import { CategoryAggregator } from '@/services/CategoryAggregator'
import { CurrencyConverter } from '@/services/CurrencyConverter'
import { ExpenseService } from '@/services/ExpenseService'
import { AccountType, Category, Currency } from '@/types/enums'
import type { CategoryRow as CategoryRowModel, Expense } from '@/types/models'
import {
  isValidOtrosGrandeName,
  normalizeOtrosGrandeName,
  parseAmountInput,
} from '@/validators/amount'

type AmountMode =
  | { type: 'create'; row: CategoryRowModel }
  | { type: 'edit'; row: CategoryRowModel; expense: Expense }
  | null

export function HomePage() {
  const { settings } = useSettingsContext()
  const {
    expenses,
    isLoading,
    createExpense,
    updateExpense,
    removeExpense,
    resetMonth,
    isMutating,
  } = useExpenses()
  const { isOnline, pendingCount } = useOnlineStatus()

  const [accountType, setAccountType] = useState<AccountType>(AccountType.WHITE)
  const [menuOpen, setMenuOpen] = useState(false)
  const [amountMode, setAmountMode] = useState<AmountMode>(null)
  const [pendingOtros, setPendingOtros] = useState<{
    amount: number
    currency: Currency
  } | null>(null)
  const [otrosName, setOtrosName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [undoDeadline, setUndoDeadline] = useState<number | null>(null)
  const [undoExpenseId, setUndoExpenseId] = useState<string | null>(null)
  const [busyRowKey, setBusyRowKey] = useState<string | null>(null)

  const { summary, color, progress, rows } = useSummary(expenses, accountType)

  const rowKey = (row: CategoryRowModel) =>
    `${row.category}:${row.description ?? ''}`

  const locked = isMutating || busyRowKey !== null

  const clearUndo = useCallback(() => {
    setUndoDeadline(null)
    setUndoExpenseId(null)
  }, [])

  const handleAmountSubmit = async (rawAmount: string, currency: Currency) => {
    if (!amountMode || !settings) {
      setAmountMode(null)
      return
    }

    const amount = parseAmountInput(rawAmount)
    const mode = amountMode
    setAmountMode(null)

    if (amount === null) {
      toast.error('Importe inválido')
      return
    }

    const key = rowKey(mode.row)
    setBusyRowKey(key)

    try {
      if (mode.type === 'edit') {
        await updateExpense({
          expenseId: mode.expense.id,
          input: { originalAmount: amount, originalCurrency: currency },
        })
        toast.success('Movimiento actualizado')
        clearUndo()
        return
      }

      if (mode.row.category === Category.OTHER && !mode.row.isOtrosGrande) {
        const rate = ExpenseService.resolveRate(accountType, currency, settings)
        const usdAmount = CurrencyConverter.convertToUsd(amount, currency, rate)

        if (CategoryAggregator.requiresOtrosGrandeName(usdAmount)) {
          setPendingOtros({ amount, currency })
          return
        }

        const expense = await createExpense({
          accountType,
          category: Category.OTHER,
          description: null,
          originalAmount: amount,
          originalCurrency: currency,
        })
        toast.success('Movimiento registrado')
        setUndoExpenseId(expense.id)
        setUndoDeadline(createUndoDeadline())
        return
      }

      const expense = await createExpense({
        accountType,
        category: mode.row.category,
        description: mode.row.isOtrosGrande ? mode.row.description : null,
        originalAmount: amount,
        originalCurrency: currency,
      })
      toast.success('Movimiento registrado')
      setUndoExpenseId(expense.id)
      setUndoDeadline(createUndoDeadline())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al registrar')
    } finally {
      setBusyRowKey(null)
    }
  }

  const confirmOtrosGrande = async () => {
    if (!pendingOtros) return
    if (!isValidOtrosGrandeName(otrosName)) {
      toast.error('Usá una o dos palabras')
      return
    }

    setBusyRowKey(`${Category.OTHER}:${normalizeOtrosGrandeName(otrosName)}`)
    try {
      const expense = await createExpense({
        accountType,
        category: Category.OTHER,
        description: normalizeOtrosGrandeName(otrosName),
        originalAmount: pendingOtros.amount,
        originalCurrency: pendingOtros.currency,
      })
      setPendingOtros(null)
      setOtrosName('')
      toast.success('Movimiento registrado')
      setUndoExpenseId(expense.id)
      setUndoDeadline(createUndoDeadline())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al registrar')
    } finally {
      setBusyRowKey(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeleteTarget(null)
    setBusyRowKey(id)
    try {
      await removeExpense(id)
      toast.success('Movimiento eliminado')
      if (undoExpenseId === id) clearUndo()
    } catch {
      toast.error('No se pudo eliminar')
    } finally {
      setBusyRowKey(null)
    }
  }

  const handleUndo = async () => {
    if (!undoExpenseId) return
    const id = undoExpenseId
    clearUndo()
    try {
      await removeExpense(id)
      toast.success('Deshecho')
    } catch {
      toast.error('No se pudo deshacer')
    }
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[480px] px-4 pb-28">
      <Header onOpenMenu={() => setMenuOpen(true)} />

      {!isOnline && (
        <p className="mb-3 rounded-xl bg-[#fff3cd] px-3 py-2 text-sm text-[#856404]">
          Sin conexión · los cambios quedan pendientes
        </p>
      )}
      {pendingCount > 0 && (
        <p className="mb-3 rounded-xl bg-[#e8f0fe] px-3 py-2 text-sm text-[var(--blue)]">
          Pendiente de sincronización ({pendingCount})
        </p>
      )}

      <MonthlySummaryCard summary={summary} color={color} progress={progress} />

      <div className="mt-4">
        <Tabs value={accountType} onChange={setAccountType} disabled={locked} />
      </div>

      <section className="mt-2 rounded-2xl bg-white px-3">
        {isLoading ? (
          <p className="py-8 text-center text-[var(--muted)]">Cargando…</p>
        ) : (
          rows.map((row) => (
            <CategoryRow
              key={rowKey(row)}
              row={row}
              disabled={locked}
              onRegister={() => setAmountMode({ type: 'create', row })}
              onEdit={() => {
                if (!row.lastExpense) return
                setAmountMode({
                  type: 'edit',
                  row,
                  expense: row.lastExpense,
                })
              }}
              onDelete={() => {
                if (!row.lastExpense) return
                setDeleteTarget(row.lastExpense)
              }}
            />
          ))
        )}
      </section>

      <AmountSheet
        open={amountMode !== null}
        title={
          amountMode?.type === 'edit'
            ? `Editar ${amountMode.row.label}`
            : amountMode
              ? amountMode.row.label
              : ''
        }
        initialAmount={
          amountMode?.type === 'edit'
            ? String(amountMode.expense.originalAmount)
            : ''
        }
        initialCurrency={
          amountMode?.type === 'edit'
            ? amountMode.expense.originalCurrency
            : Currency.USD
        }
        onSubmit={(amount, currency) => void handleAmountSubmit(amount, currency)}
        onCancel={() => setAmountMode(null)}
      />

      <Modal
        open={pendingOtros !== null}
        title="Nombre del gasto"
        onClose={() => {
          setPendingOtros(null)
          setOtrosName('')
        }}
      >
        <p className="mb-3 text-sm text-[var(--muted)]">Una o dos palabras</p>
        <input
          value={otrosName}
          onChange={(event) => setOtrosName(event.target.value)}
          className="mb-4 min-h-12 w-full rounded-xl border border-[var(--border)] px-4 text-lg outline-none focus:border-[var(--blue)]"
          aria-label="Nombre del gasto"
          autoFocus
        />
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              setPendingOtros(null)
              setOtrosName('')
            }}
          >
            Cancelar
          </Button>
          <Button className="flex-1" onClick={() => void confirmOtrosGrande()}>
            Guardar
          </Button>
        </div>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        title="Eliminar movimiento"
        onClose={() => setDeleteTarget(null)}
      >
        <p className="mb-4 text-[var(--muted)]">
          ¿Eliminar el último movimiento?
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setDeleteTarget(null)}
          >
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1" onClick={() => void handleDelete()}>
            Eliminar
          </Button>
        </div>
      </Modal>

      <SideMenu
        open={menuOpen}
        expenses={expenses}
        onClose={() => setMenuOpen(false)}
        onResetMonth={resetMonth}
      />

      <UndoBar deadline={undoDeadline} onUndo={() => void handleUndo()} onExpire={clearUndo} />
    </div>
  )
}
