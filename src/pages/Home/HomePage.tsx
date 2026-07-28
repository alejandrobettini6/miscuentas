import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { AddCategoryRow } from '@/components/expenses/AddCategoryRow'
import { CategoryRow } from '@/components/expenses/CategoryRow'
import { Header } from '@/components/layout/Header'
import { SideMenu } from '@/components/layout/SideMenu'
import { UndoBar, createUndoDeadline } from '@/components/layout/UndoBar'
import {
  draftToSettingsInput,
  type OnboardingDraft,
} from '@/components/settings/onboardingDraft'

// Paneles y modales pesados: se cargan bajo demanda para acelerar el arranque.
const CategoryDetailsModal = lazy(() =>
  import('@/components/expenses/CategoryDetailsModal').then((m) => ({
    default: m.CategoryDetailsModal,
  })),
)
const ImportAccountsModal = lazy(() =>
  import('@/components/settings/ImportAccountsModal').then((m) => ({
    default: m.ImportAccountsModal,
  })),
)
const CardStatementImportWizard = lazy(() =>
  import('@/components/import/CardStatementImportWizard').then((m) => ({
    default: m.CardStatementImportWizard,
  })),
)
const OnboardingWizard = lazy(() =>
  import('@/components/settings/OnboardingWizard').then((m) => ({
    default: m.OnboardingWizard,
  })),
)
const SettingsPanel = lazy(() =>
  import('@/components/settings/SettingsPanel').then((m) => ({
    default: m.SettingsPanel,
  })),
)
import { MonthlySummaryCard } from '@/components/summary/MonthlySummaryCard'
import { AmountSheet } from '@/components/ui/AmountSheet'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { CATEGORY_LABELS, DEFAULT_SETTINGS } from '@/constants/categories'
import { useSettingsContext } from '@/contexts/SettingsContext'
import { useAmountsVisibility } from '@/hooks/useAmountsVisibility'
import { useExpenses } from '@/hooks/useExpenses'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { usePeriods } from '@/hooks/usePeriods'
import { useSummary } from '@/hooks/useSummary'
import { CategoryAggregator } from '@/services/CategoryAggregator'
import { VisibilityProjector } from '@/services/VisibilityProjector'
import { AccountType, Category, Currency, MonthMode, PeriodStatus, SummaryDisplayMode } from '@/types/enums'
import type { CategoryRow as CategoryRowModel, Expense } from '@/types/models'
import { getMonthLabelFromKey, getYearMonthKey, nextYearMonth } from '@/utils/date'
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
    expenses: allExpenses,
    isLoading,
    createExpense,
    updateExpense,
    removeExpense,
    isMutating,
    refresh: refreshExpenses,
  } = useExpenses()
  const {
    periods,
    activePeriod,
    closePeriod,
    isClosing,
    advanceNextPeriod,
    isAdvancing,
    refresh: refreshPeriods,
  } = usePeriods()
  const { isOnline, pendingCount } = useOnlineStatus()
  const [amountsHidden, toggleAmountsHidden] = useAmountsVisibility()

  const enabledAccounts = settings?.enabledAccounts ?? [
    AccountType.WHITE,
    AccountType.CASH,
  ]
  const enabledCurrencies = settings?.enabledCurrencies ?? [
    Currency.USD,
    Currency.ARS,
  ]

  const [accountType, setAccountType] = useState<AccountType>(
    enabledAccounts[0] ?? AccountType.WHITE,
  )
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importStatementOpen, setImportStatementOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [onboardingMode, setOnboardingMode] = useState<'initial' | 'reconfigure'>(
    'initial',
  )
  const [amountMode, setAmountMode] = useState<AmountMode>(null)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [removeCategoryTarget, setRemoveCategoryTarget] =
    useState<CategoryRowModel | null>(null)
  const [detailsRow, setDetailsRow] = useState<CategoryRowModel | null>(null)
  const [confirmAdvancePeriod, setConfirmAdvancePeriod] = useState(false)
  const [undoDeadline, setUndoDeadline] = useState<number | null>(null)
  const [undoExpenseId, setUndoExpenseId] = useState<string | null>(null)
  const [busyRowKey, setBusyRowKey] = useState<string | null>(null)

  useEffect(() => {
    if (!settings) return
    if (!settings.onboardingCompleted) {
      setOnboardingMode('initial')
      setOnboardingOpen(true)
    }
  }, [settings])

  useEffect(() => {
    if (!enabledAccounts.includes(accountType)) {
      setAccountType(enabledAccounts[0] ?? AccountType.WHITE)
    }
  }, [enabledAccounts, accountType])

  useEffect(() => {
    if (selectedPeriodId && periods.some((p) => p.id === selectedPeriodId)) return
    if (activePeriod) setSelectedPeriodId(activePeriod.id)
    else if (periods[0]) setSelectedPeriodId(periods[0].id)
  }, [periods, activePeriod, selectedPeriodId])

  const selectedPeriod =
    periods.find((p) => p.id === selectedPeriodId) ?? activePeriod
  const isReadOnly =
    !selectedPeriod || selectedPeriod.status === PeriodStatus.CLOSED

  const visibleExpenses = useMemo(() => {
    if (!settings || !selectedPeriod) return []
    return VisibilityProjector.projectPeriod(
      allExpenses,
      settings,
      selectedPeriod.id,
    )
  }, [allExpenses, settings, selectedPeriod])

  const { summary, color, progress, rows, accountingCurrency, rates } = useSummary(
    visibleExpenses,
    accountType,
  )

  const rowKey = useCallback(
    (row: CategoryRowModel) => `${row.category}:${row.description ?? ''}`,
    [],
  )

  const locked = isMutating || isClosing || busyRowKey !== null || isReadOnly

  const handleRegisterRow = useCallback(
    (row: CategoryRowModel) => {
      if (isReadOnly) return
      setAmountMode({ type: 'create', row })
    },
    [isReadOnly],
  )

  const handleEditRow = useCallback(
    (row: CategoryRowModel) => {
      if (isReadOnly || !row.lastExpense) return
      setAmountMode({ type: 'edit', row, expense: row.lastExpense })
    },
    [isReadOnly],
  )

  const handleDeleteRow = useCallback(
    (row: CategoryRowModel) => {
      if (isReadOnly || !row.lastExpense) return
      setDeleteTarget(row.lastExpense)
    },
    [isReadOnly],
  )

  const handleViewDetailsRow = useCallback((row: CategoryRowModel) => {
    setDetailsRow(row)
  }, [])

  const handleEditExpenseFromDetails = useCallback(
    (expense: Expense) => {
      if (isReadOnly || !detailsRow) return
      const row = detailsRow
      setDetailsRow(null)
      setAmountMode({ type: 'edit', row, expense })
    },
    [isReadOnly, detailsRow],
  )

  const handleDeleteExpenseFromDetails = useCallback(
    (expense: Expense) => {
      if (isReadOnly) return
      setDetailsRow(null)
      setDeleteTarget(expense)
    },
    [isReadOnly],
  )

  const handleRemoveCategoryRow = useCallback((row: CategoryRowModel) => {
    setRemoveCategoryTarget(row)
  }, [])

  const detailsItems = useMemo(() => {
    if (!detailsRow) return []
    return CategoryAggregator.expensesForRow(
      visibleExpenses,
      accountType,
      detailsRow,
    )
  }, [detailsRow, visibleExpenses, accountType])

  const detailsAccountTotals = useMemo(() => {
    if (!detailsRow) return { totalWhite: 0, totalCash: 0 }
    return CategoryAggregator.accountTotalsForRow(
      visibleExpenses,
      detailsRow,
      accountingCurrency,
      rates,
    )
  }, [detailsRow, visibleExpenses, accountingCurrency, rates])

  const clearUndo = useCallback(() => {
    setUndoDeadline(null)
    setUndoExpenseId(null)
  }, [])

  const handleAmountSubmit = async (
    rawAmount: string,
    currency: Currency,
    categoryNameOrDetail?: string,
  ) => {
    if (!amountMode || !settings || !selectedPeriod || isReadOnly) {
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
          periodId: selectedPeriod.id,
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
          periodId: selectedPeriod.id,
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
        periodId: selectedPeriod.id,
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
    if (!deleteTarget || isReadOnly) return
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
    if (!undoExpenseId || isReadOnly) return
    const id = undoExpenseId
    clearUndo()
    try {
      await removeExpense(id)
      toast.success('Deshecho')
    } catch {
      toast.error('No se pudo deshacer')
    }
  }

  const nextPeriodPreviewLabel = useMemo(() => {
    const sorted = [...periods].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
    const last = sorted[sorted.length - 1]
    const targetYearMonth = last
      ? nextYearMonth(last.yearMonth)
      : getYearMonthKey()
    return getMonthLabelFromKey(targetYearMonth)
  }, [periods])

  const handleRequestNextPeriod = useCallback(() => {
    setConfirmAdvancePeriod(true)
  }, [])

  const handleConfirmAdvancePeriod = async () => {
    setConfirmAdvancePeriod(false)
    try {
      const next = await advanceNextPeriod()
      setSelectedPeriodId(next.id)
      toast.success(`${next.label} habilitado para registrar por adelantado`)
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo adelantar el mes'))
    }
  }

  const handleAddCategory = async (rawName: string) => {
    if (!settings || isReadOnly) throw new Error('Sin configuración')

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

    const fromExpenses = allExpenses.some(
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
    allExpenses.filter(
      (e) =>
        e.category === Category.OTHER &&
        Boolean(e.description) &&
        e.description!.toLowerCase() === (row.description ?? '').toLowerCase(),
    )

  const canRemoveCustomCategory = (row: CategoryRowModel) =>
    row.isOtrosGrande && customExpensesForRow(row).length === 0 && !isReadOnly

  const handleRemoveCategory = async () => {
    if (!removeCategoryTarget || !settings || isReadOnly) return
    const row = removeCategoryTarget
    const key = rowKey(row)
    setRemoveCategoryTarget(null)
    setDetailsRow(null)
    setBusyRowKey(key)

    try {
      // No borramos movimientos: solo quitamos la categoría de settings.
      // Si hay gastos, se vuelve a sembrar al agregar de nuevo o desde movimientos.
      const relatedCount = customExpensesForRow(row).length
      const lower = (row.description ?? '').toLowerCase()
      const nextCustom = settings.customCategories.filter(
        (c) => c.toLowerCase() !== lower,
      )
      if (nextCustom.length !== settings.customCategories.length) {
        await updateSettings({ customCategories: nextCustom })
      }

      toast.success(
        relatedCount > 0
          ? 'Categoría oculta (movimientos conservados)'
          : 'Categoría eliminada',
      )
      clearUndo()
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo eliminar la categoría'))
    } finally {
      setBusyRowKey(null)
    }
  }

  const completeOnboarding = async (draft: OnboardingDraft) => {
    await updateSettings(draftToSettingsInput(draft))
    setOnboardingOpen(false)
    toast.success('Configuración aplicada')
  }

  const skipOnboarding = async () => {
    await updateSettings({
      enabledAccounts: [...DEFAULT_SETTINGS.enabledAccounts],
      enabledCurrencies: [...DEFAULT_SETTINGS.enabledCurrencies],
      enabledFixedCategories: [...DEFAULT_SETTINGS.enabledFixedCategories],
      customCategories: [...DEFAULT_SETTINGS.customCategories],
      monthMode: MonthMode.AUTOMATIC,
      accountingCurrency: DEFAULT_SETTINGS.accountingCurrency,
      summaryDisplayMode: DEFAULT_SETTINGS.summaryDisplayMode,
      monthlyLimit: DEFAULT_SETTINGS.monthlyLimit,
      onboardingCompleted: true,
    })
    setOnboardingOpen(false)
    toast.success('Configuración por defecto aplicada')
  }

  const showCategoryName =
    amountMode?.type === 'create' &&
    amountMode.row.category === Category.OTHER &&
    !amountMode.row.isOtrosGrande

  const showDetail =
    amountMode?.type === 'create' &&
    amountMode.row.category !== Category.OTHER &&
    !amountMode.row.isOtrosGrande

  // Moneda por defecto al registrar: la moneda de expresión configurada por
  // el usuario (accountingCurrency), no siempre USD.
  const defaultCurrency = accountingCurrency

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[480px] px-4 pb-28">
      <Header
        onOpenMenu={() => setMenuOpen(true)}
        periods={periods}
        selectedPeriodId={selectedPeriod?.id ?? null}
        onSelectPeriod={setSelectedPeriodId}
        readOnly={isReadOnly}
        onRequestNextPeriod={handleRequestNextPeriod}
        advancingPeriod={isAdvancing}
      />

      {!isOnline && (
        <p className="mb-3 rounded-xl bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn-text)]">
          Sin conexión · los cambios quedan pendientes
        </p>
      )}
      {pendingCount > 0 && (
        <p className="mb-3 rounded-xl bg-[var(--info-bg)] px-3 py-2 text-sm text-[var(--blue)]">
          Pendiente de sincronización ({pendingCount})
        </p>
      )}
      {isReadOnly && (
        <p className="mb-3 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--muted)]">
          Estás viendo un mes cerrado. Solo lectura.
        </p>
      )}

      <MonthlySummaryCard
        summary={summary}
        color={color}
        progress={progress}
        enabledAccounts={enabledAccounts}
        accountingCurrency={accountingCurrency}
        displayMode={settings?.summaryDisplayMode ?? SummaryDisplayMode.LIMIT}
        amountsHidden={amountsHidden}
        onToggleAmounts={toggleAmountsHidden}
      />

      <div className="mt-4">
        <Tabs
          value={accountType}
          onChange={setAccountType}
          enabledAccounts={enabledAccounts}
          disabled={locked && !isReadOnly ? true : false}
        />
      </div>

      <section className="mt-2 rounded-2xl bg-[var(--surface)] px-3">
        {isLoading ? (
          <p className="py-8 text-center text-[var(--muted)]">Cargando…</p>
        ) : (
          <>
            {rows.map((row) => (
              <CategoryRow
                key={rowKey(row)}
                row={row}
                accountingCurrency={accountingCurrency}
                rates={rates}
                disabled={locked}
                canRemoveCategory={canRemoveCustomCategory(row)}
                onRegister={handleRegisterRow}
                onEdit={handleEditRow}
                onDelete={handleDeleteRow}
                onViewDetails={handleViewDetailsRow}
                onRemoveCategory={handleRemoveCategoryRow}
              />
            ))}
            {!isReadOnly && (
              <AddCategoryRow disabled={locked} onAdd={handleAddCategory} />
            )}
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
            : defaultCurrency
        }
        enabledCurrencies={enabledCurrencies}
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
            ? `¿Ocultar “${removeCategoryTarget.label}”? Sus movimientos se conservan.`
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
            Confirmar
          </Button>
        </div>
      </Modal>

      <Modal
        open={confirmAdvancePeriod}
        title="Adelantar mes"
        onClose={() => setConfirmAdvancePeriod(false)}
      >
        <p className="mb-4 text-[var(--muted)]">
          ¿Adelantar a <span className="font-semibold text-[var(--text)]">{nextPeriodPreviewLabel}</span>?
          Vas a poder registrar gastos ahí sin cerrar{' '}
          {selectedPeriod?.label ?? 'el mes actual'}. Los movimientos no se mezclan
          entre meses.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setConfirmAdvancePeriod(false)}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            disabled={isAdvancing}
            onClick={() => void handleConfirmAdvancePeriod()}
          >
            Adelantar
          </Button>
        </div>
      </Modal>

      <SideMenu
        open={menuOpen}
        expenses={visibleExpenses}
        allExpenses={allExpenses}
        periods={periods}
        monthMode={settings?.monthMode ?? MonthMode.AUTOMATIC}
        onClose={() => setMenuOpen(false)}
        onClosePeriod={async () => {
          await closePeriod()
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenOnboarding={() => {
          setOnboardingMode('reconfigure')
          setOnboardingOpen(true)
        }}
        onOpenImport={() => setImportOpen(true)}
        onOpenCardStatementImport={() => setImportStatementOpen(true)}
      />

      {detailsRow !== null && (
        <Suspense fallback={null}>
          <CategoryDetailsModal
            open
            row={detailsRow}
            accountType={accountType}
            items={detailsItems}
            totalWhite={detailsAccountTotals.totalWhite}
            totalCash={detailsAccountTotals.totalCash}
            enabledAccounts={enabledAccounts}
            accountingCurrency={accountingCurrency}
            rates={rates}
            isReadOnly={isReadOnly}
            onClose={() => setDetailsRow(null)}
            onRemoveCategory={
              detailsRow.isOtrosGrande && !isReadOnly
                ? () => {
                    const row = detailsRow
                    setDetailsRow(null)
                    setRemoveCategoryTarget(row)
                  }
                : undefined
            }
            onEditExpense={isReadOnly ? undefined : handleEditExpenseFromDetails}
            onDeleteExpense={
              isReadOnly ? undefined : handleDeleteExpenseFromDetails
            }
          />
        </Suspense>
      )}

      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsPanel
            open
            onClose={() => setSettingsOpen(false)}
            onOpenOnboarding={() => {
              setOnboardingMode('reconfigure')
              setOnboardingOpen(true)
            }}
          />
        </Suspense>
      )}

      {onboardingOpen && settings && (
        <Suspense fallback={null}>
          <OnboardingWizard
            open
            mode={onboardingMode}
            settings={settings}
            expenses={allExpenses}
            periods={periods}
            onSkip={skipOnboarding}
            onComplete={completeOnboarding}
            onClose={
              onboardingMode === 'reconfigure' || settings.onboardingCompleted
                ? () => setOnboardingOpen(false)
                : undefined
            }
          />
        </Suspense>
      )}

      {importOpen && (
        <Suspense fallback={null}>
          <ImportAccountsModal
            open
            expenses={allExpenses}
            periods={periods}
            onClose={() => setImportOpen(false)}
            onImported={async () => {
              await refreshPeriods()
              await refreshExpenses()
            }}
          />
        </Suspense>
      )}

      {importStatementOpen && settings && (
        <Suspense fallback={null}>
          <CardStatementImportWizard
            open
            period={selectedPeriod ?? null}
            readOnly={isReadOnly}
            settings={settings}
            onClose={() => setImportStatementOpen(false)}
            createExpense={createExpense}
            updateSettings={updateSettings}
          />
        </Suspense>
      )}

      {!isReadOnly && (
        <UndoBar
          deadline={undoDeadline}
          onUndo={() => void handleUndo()}
          onExpire={clearUndo}
        />
      )}
    </div>
  )
}
