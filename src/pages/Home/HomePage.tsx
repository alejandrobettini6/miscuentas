import { useCallback, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { AddCategoryRow } from '@/components/expenses/AddCategoryRow'
import { CategoryDetailsModal } from '@/components/expenses/CategoryDetailsModal'
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
import { CATEGORY_LABELS } from '@/constants/categories'
import { CategoryAggregator } from '@/services/CategoryAggregator'
import { AccountType, Category, Currency } from '@/types/enums'
import type { CategoryRow as CategoryRowModel, Expense } from '@/types/models'
import { getErrorMessage } from '@/utils/errors'
import {
  isValidCustomCategoryName,
  normalizeCustomCategoryName,
  parseAmountInput,
} from '@/validators/amount'

type AmountMode =
  | { type: 'create'; row: CategoryRowModel }
  | { type: 'edit'; row: CategoryRowModel; expense: Expense }
  | null

export function HomePage() {
  const { settings, updateSettings } = useSettingsContext()
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
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [removeCategoryTarget, setRemoveCategoryTarget] =
    useState<CategoryRowModel | null>(null)
  const [detailsRow, setDetailsRow] = useState<CategoryRowModel | null>(null)
  const [undoDeadline, setUndoDeadline] = useState<number | null>(null)
  const [undoExpenseId, setUndoExpenseId] = useState<string | null>(null)
  const [busyRowKey, setBusyRowKey] = useState<string | null>(null)

  const { summary, color, progress, rows } = useSummary(expenses, accountType)

  const rowKey = (row: CategoryRowModel) =>
    `${row.category}:${row.description ?? ''}`

  const locked = isMutating || busyRowKey !== null

  const detailsItems = useMemo(() => {
    if (!detailsRow) return []
    return CategoryAggregator.expensesForRow(expenses, accountType, detailsRow)
  }, [detailsRow, expenses, accountType])

  const detailsAccountTotals = useMemo(() => {
    if (!detailsRow) return { totalWhite: 0, totalCash: 0 }
    return CategoryAggregator.accountTotalsForRow(expenses, detailsRow)
  }, [detailsRow, expenses])

  const clearUndo = useCallback(() => {
    setUndoDeadline(null)
    setUndoExpenseId(null)
  }, [])

  const handleAmountSubmit = async (
    rawAmount: string,
    currency: Currency,
    categoryNameOrDetail?: string,
  ) => {
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
        const trimmedName = categoryNameOrDetail?.trim() ?? ''
        let description: string | null = null
        if (trimmedName) {
          if (!isValidCustomCategoryName(trimmedName)) {
            toast.error('Nombre de categoría inválido (máx. 40 caracteres)')
            return
          }
          description = normalizeCustomCategoryName(trimmedName)
        }

        const expense = await createExpense({
          accountType,
          category: Category.OTHER,
          description,
          originalAmount: amount,
          originalCurrency: currency,
        })
        toast.success('Movimiento registrado')
        setUndoExpenseId(expense.id)
        setUndoDeadline(createUndoDeadline())
        return
      }

      if (mode.row.isOtrosGrande) {
        const expense = await createExpense({
          accountType,
          category: Category.OTHER,
          description: mode.row.description,
          originalAmount: amount,
          originalCurrency: currency,
        })
        toast.success('Movimiento registrado')
        setUndoExpenseId(expense.id)
        setUndoDeadline(createUndoDeadline())
        return
      }

      // Categoría fija: detalle opcional en description
      let detail: string | null = null
      const trimmedDetail = categoryNameOrDetail?.trim() ?? ''
      if (trimmedDetail) {
        if (!isValidCustomCategoryName(trimmedDetail)) {
          toast.error('Detalle inválido (máx. 40 caracteres)')
          return
        }
        detail = normalizeCustomCategoryName(trimmedDetail)
      }

      const expense = await createExpense({
        accountType,
        category: mode.row.category,
        description: detail,
        originalAmount: amount,
        originalCurrency: currency,
      })
      toast.success('Movimiento registrado')
      setUndoExpenseId(expense.id)
      setUndoDeadline(createUndoDeadline())
    } catch (error) {
      toast.error(getErrorMessage(error, 'Error al registrar'))
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

  const handleAddCategory = async (rawName: string) => {
    if (!settings) throw new Error('Sin configuración')

    if (!isValidCustomCategoryName(rawName)) {
      throw new Error('Nombre inválido (máx. 40 caracteres)')
    }
    const name = normalizeCustomCategoryName(rawName)
    const lower = name.toLowerCase()

    const fixedLabels = Object.values(CATEGORY_LABELS).map((l) => l.toLowerCase())
    if (fixedLabels.includes(lower)) {
      throw new Error('Esa categoría ya existe')
    }

    const existingCustom = settings.customCategories.map((c) => c.toLowerCase())
    if (existingCustom.includes(lower)) {
      throw new Error('Esa categoría ya existe')
    }

    const fromExpenses = expenses.some(
      (e) =>
        e.category === Category.OTHER &&
        e.description?.toLowerCase() === lower,
    )
    if (fromExpenses) {
      throw new Error('Esa categoría ya existe')
    }

    await updateSettings({
      customCategories: [...settings.customCategories, name],
    })
    toast.success('Categoría agregada')
  }

  const customExpensesForRow = (row: CategoryRowModel) =>
    expenses.filter(
      (e) =>
        e.category === Category.OTHER &&
        Boolean(e.description) &&
        e.description!.toLowerCase() === (row.description ?? '').toLowerCase(),
    )

  const canRemoveCustomCategory = (row: CategoryRowModel) =>
    row.isOtrosGrande && customExpensesForRow(row).length === 0

  const handleRemoveCategory = async () => {
    if (!removeCategoryTarget || !settings) return
    const row = removeCategoryTarget
    const key = rowKey(row)
    setRemoveCategoryTarget(null)
    setDetailsRow(null)
    setBusyRowKey(key)

    try {
      const related = customExpensesForRow(row)
      for (const expense of related) {
        await removeExpense(expense.id)
      }

      const lower = (row.description ?? '').toLowerCase()
      const nextCustom = settings.customCategories.filter(
        (c) => c.toLowerCase() !== lower,
      )
      if (nextCustom.length !== settings.customCategories.length) {
        await updateSettings({ customCategories: nextCustom })
      }

      toast.success('Categoría eliminada')
      clearUndo()
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo eliminar la categoría'))
    } finally {
      setBusyRowKey(null)
    }
  }

  const showCategoryName =
    amountMode?.type === 'create' &&
    amountMode.row.category === Category.OTHER &&
    !amountMode.row.isOtrosGrande

  const showDetail =
    amountMode?.type === 'create' &&
    amountMode.row.category !== Category.OTHER &&
    !amountMode.row.isOtrosGrande

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
          <>
            {rows.map((row) => (
              <CategoryRow
                key={rowKey(row)}
                row={row}
                disabled={locked}
                canRemoveCategory={canRemoveCustomCategory(row)}
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
                onViewDetails={() => setDetailsRow(row)}
                onRemoveCategory={() => setRemoveCategoryTarget(row)}
              />
            ))}
            <AddCategoryRow disabled={locked} onAdd={handleAddCategory} />
          </>
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
            ? String(Math.abs(amountMode.expense.originalAmount))
            : ''
        }
        initialCurrency={
          amountMode?.type === 'edit'
            ? amountMode.expense.originalCurrency
            : Currency.USD
        }
        showCategoryName={showCategoryName}
        showDetail={showDetail}
        onSubmit={(amount, currency, categoryName) =>
          void handleAmountSubmit(amount, currency, categoryName)
        }
        onCancel={() => setAmountMode(null)}
      />

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

      <Modal
        open={removeCategoryTarget !== null}
        title="Eliminar categoría"
        onClose={() => setRemoveCategoryTarget(null)}
      >
        <p className="mb-4 text-[var(--muted)]">
          {removeCategoryTarget &&
          customExpensesForRow(removeCategoryTarget).length > 0
            ? `¿Eliminar “${removeCategoryTarget.label}” y todos sus movimientos?`
            : `¿Eliminar la categoría “${removeCategoryTarget?.label ?? ''}”?`}
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setRemoveCategoryTarget(null)}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => void handleRemoveCategory()}
          >
            Eliminar
          </Button>
        </div>
      </Modal>

      <CategoryDetailsModal
        open={detailsRow !== null}
        row={detailsRow}
        accountType={accountType}
        items={detailsItems}
        totalWhite={detailsAccountTotals.totalWhite}
        totalCash={detailsAccountTotals.totalCash}
        onClose={() => setDetailsRow(null)}
        onRemoveCategory={
          detailsRow?.isOtrosGrande
            ? () => {
                const row = detailsRow
                setDetailsRow(null)
                setRemoveCategoryTarget(row)
              }
            : undefined
        }
      />

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
