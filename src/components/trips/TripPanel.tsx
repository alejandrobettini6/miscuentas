import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Settings as SettingsIcon } from 'lucide-react'
import { TRIP_INDIVIDUAL_MERGE_ENABLED, TRIP_OTHER_CATEGORY } from '@/constants/tripCategories'
import { useSettingsContext } from '@/contexts/SettingsContext'
import { useTrips, useTripExpenses } from '@/hooks/useTrips'
import { useExpenses } from '@/hooks/useExpenses'
import { useIncomes } from '@/hooks/useIncomes'
import { usePeriods } from '@/hooks/usePeriods'
import { useSavings } from '@/hooks/useSavings'
import { resolveAccountingCurrency, type ExchangeRates } from '@/services/AccountingCurrency'
import { TripCategoryAggregator } from '@/services/TripCategoryAggregator'
import { TripMergeService, type MergeDestination } from '@/services/TripMergeService'
import { tripAsCategoryLabel } from '@/services/TripCategoryMapper'
import { TripSummaryCalculator } from '@/services/TripSummaryCalculator'
import { getTripRepository } from '@/repositories'
import { AccountType, BudgetColor, Currency, PeriodStatus, TripMergeMode, TripStatus } from '@/types/enums'
import type { Expense, TripCategoryRow as TripCategoryRowModel, TripExpense } from '@/types/models'
import { getErrorMessage } from '@/utils/errors'
import {
  isValidCustomCategoryName,
  normalizeCustomCategoryName,
  parseAmountInput,
} from '@/validators/amount'
import { AddCategoryRow } from '@/components/expenses/AddCategoryRow'
import { AmountSheet } from '@/components/ui/AmountSheet'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { UndoBar, createUndoDeadline } from '@/components/layout/UndoBar'
import { TripCategoryRow } from './TripCategoryRow'
import { TripSelector } from './TripSelector'
import { TripSummaryCard } from './TripSummaryCard'
import { TripSettingsSideMenu } from './TripSettingsSideMenu'
import { TripSavingsImpactModal } from './TripSavingsImpactModal'
import type { TripSavingsImpactPreview } from '@/services/SavingsReconciliationService'
import { SavingsReconciliationService } from '@/services/SavingsReconciliationService'

const CreateTripWizard = lazy(() =>
  import('./CreateTripWizard').then((m) => ({ default: m.CreateTripWizard })),
)
const TripDetailsModal = lazy(() =>
  import('./TripDetailsModal').then((m) => ({ default: m.TripDetailsModal })),
)
const CloseTripWizard = lazy(() =>
  import('./CloseTripWizard').then((m) => ({ default: m.CloseTripWizard })),
)

type AmountMode =
  | { type: 'create'; row: TripCategoryRowModel }
  | { type: 'edit'; row: TripCategoryRowModel; expense: TripExpense }
  | null

interface TripPanelProps {
  onAllTripsClosed?: () => void | Promise<void>
  onTripMerged?: (payload: {
    tripName: string
    createdExpenseIds: string[]
  }) => void | Promise<void>
}

export function TripPanel({ onAllTripsClosed, onTripMerged }: TripPanelProps) {
  const { settings, updateSettings } = useSettingsContext()
  const {
    trips,
    isLoading: tripsLoading,
    error: tripsError,
    createTrip,
    updateTrip,
    closeTrip,
    isMutating: tripMutating,
  } = useTrips()
  const { createExpense: createMonthlyExpense, expenses: monthlyExpenses, refresh: refreshMonthlyExpenses } =
    useExpenses()
  const { incomes: monthlyIncomes } = useIncomes()
  const { periods, refresh: refreshPeriods } = usePeriods()
  const {
    previewTripMergeImpact,
    reconcilePeriodsAfterMerge,
  } = useSavings()

  const activeTrips = useMemo(
    () => trips.filter((t) => t.status === TripStatus.ACTIVE),
    [trips],
  )

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false)
  const [closeTripOpen, setCloseTripOpen] = useState(false)
  const [accountType, setAccountType] = useState<AccountType>(AccountType.WHITE)
  const [amountMode, setAmountMode] = useState<AmountMode>(null)
  const [deleteTarget, setDeleteTarget] = useState<TripExpense | null>(null)
  const [removeCategoryTarget, setRemoveCategoryTarget] = useState<TripCategoryRowModel | null>(null)
  const [detailsRow, setDetailsRow] = useState<TripCategoryRowModel | null>(null)
  const [undoDeadline, setUndoDeadline] = useState<number | null>(null)
  const [undoExpenseId, setUndoExpenseId] = useState<string | null>(null)
  const [busyRowKey, setBusyRowKey] = useState<string | null>(null)
  const [savingsImpactPreview, setSavingsImpactPreview] =
    useState<TripSavingsImpactPreview | null>(null)
  const [pendingCloseOptions, setPendingCloseOptions] = useState<{
    merge: boolean
    mergeMode?: TripMergeMode
    destination?: MergeDestination
  } | null>(null)
  const [savingsImpactBusy, setSavingsImpactBusy] = useState(false)

  useEffect(() => {
    if (selectedTripId && activeTrips.some((t) => t.id === selectedTripId)) return
    const lastActive = [...activeTrips].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0]
    if (lastActive) setSelectedTripId(lastActive.id)
  }, [activeTrips, selectedTripId])

  const selectedTrip = activeTrips.find((t) => t.id === selectedTripId) ?? null

  useEffect(() => {
    if (!selectedTrip) return
    if (!selectedTrip.enabledAccounts.includes(accountType)) {
      setAccountType(selectedTrip.enabledAccounts[0] ?? AccountType.WHITE)
    }
  }, [selectedTrip, accountType])

  const {
    expenses: tripExpenses,
    isLoading: expensesLoading,
    createExpense,
    updateExpense,
    removeExpense,
    isMutating: expenseMutating,
  } = useTripExpenses(selectedTripId)

  const accountingCurrency = settings
    ? resolveAccountingCurrency(settings)
    : Currency.USD
  const rates: ExchangeRates = settings
    ? { usdWhite: settings.usdWhite, usdCash: settings.usdCash }
    : { usdWhite: 1, usdCash: 1 }

  const rows = useMemo(() => {
    if (!selectedTrip) return []
    return TripCategoryAggregator.buildRows(
      tripExpenses,
      accountType,
      selectedTrip.enabledCategories,
      selectedTrip.customCategories,
      accountingCurrency,
      rates,
    )
  }, [tripExpenses, accountType, selectedTrip, accountingCurrency, rates])

  const { summary, color, progress } = useMemo(() => {
    if (!selectedTrip) {
      return {
        summary: { totalWhite: 0, totalCash: 0, totalSpent: 0, available: 0, remainingPercent: 100 },
        color: BudgetColor.GREEN,
        progress: 1,
      }
    }
    const s = TripSummaryCalculator.calculate(
      tripExpenses,
      selectedTrip.budgetLimit,
      accountingCurrency,
      rates,
    )
    return {
      summary: s,
      color: TripSummaryCalculator.resolveBudgetColor(s.remainingPercent, s.available),
      progress: TripSummaryCalculator.progressRatio(s.available, selectedTrip.budgetLimit),
    }
  }, [tripExpenses, selectedTrip, accountingCurrency, rates])

  const locked = tripMutating || expenseMutating || busyRowKey !== null

  const rowKey = useCallback(
    (row: TripCategoryRowModel) => `${row.category}:${row.description ?? ''}`,
    [],
  )

  const clearUndo = useCallback(() => {
    setUndoDeadline(null)
    setUndoExpenseId(null)
  }, [])

  const handleRegisterRow = useCallback((row: TripCategoryRowModel) => {
    setAmountMode({ type: 'create', row })
  }, [])

  const handleEditRow = useCallback((row: TripCategoryRowModel) => {
    if (!row.lastExpense) return
    setAmountMode({ type: 'edit', row, expense: row.lastExpense })
  }, [])

  const handleDeleteRow = useCallback((row: TripCategoryRowModel) => {
    if (!row.lastExpense) return
    setDeleteTarget(row.lastExpense)
  }, [])

  const handleViewDetailsRow = useCallback((row: TripCategoryRowModel) => {
    setDetailsRow(row)
  }, [])

  const handleEditFromDetails = useCallback(
    (expense: TripExpense) => {
      if (!detailsRow) return
      const row = detailsRow
      setDetailsRow(null)
      setAmountMode({ type: 'edit', row, expense })
    },
    [detailsRow],
  )

  const handleDeleteFromDetails = useCallback((expense: TripExpense) => {
    setDeleteTarget(expense)
  }, [])

  const handleRemoveCategoryRow = useCallback((row: TripCategoryRowModel) => {
    setRemoveCategoryTarget(row)
  }, [])

  const detailsItems = useMemo(() => {
    if (!detailsRow || !selectedTrip) return []
    return TripCategoryAggregator.expensesForRow(
      tripExpenses,
      accountType,
      detailsRow,
      selectedTrip.customCategories,
    )
  }, [detailsRow, tripExpenses, accountType, selectedTrip])

  const detailsAccountTotals = useMemo(() => {
    if (!detailsRow || !selectedTrip) return { totalWhite: 0, totalCash: 0 }
    return TripCategoryAggregator.accountTotalsForRow(
      tripExpenses,
      detailsRow,
      accountingCurrency,
      rates,
      selectedTrip.customCategories,
    )
  }, [detailsRow, tripExpenses, accountingCurrency, rates, selectedTrip])

  const handleAmountSubmit = async (
    rawAmount: string,
    currency: Currency,
    categoryNameOrDetail?: string,
  ) => {
    if (!amountMode || !settings || !selectedTrip) {
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
          trip: selectedTrip,
        })
        toast.success('Movimiento actualizado')
        clearUndo()
        return
      }

      if (mode.row.category === TRIP_OTHER_CATEGORY && !mode.row.isOtrosGrande) {
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
          input: {
            tripId: selectedTrip.id,
            accountType,
            category: TRIP_OTHER_CATEGORY,
            description,
            originalAmount: amount,
            originalCurrency: currency,
          },
          trip: selectedTrip,
        })
        toast.success('Movimiento registrado')
        setUndoExpenseId(expense.id)
        setUndoDeadline(createUndoDeadline())
        return
      }

      if (mode.row.isOtrosGrande) {
        const expense = await createExpense({
          input: {
            tripId: selectedTrip.id,
            accountType,
            category: TRIP_OTHER_CATEGORY,
            description: mode.row.description,
            originalAmount: amount,
            originalCurrency: currency,
          },
          trip: selectedTrip,
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
        input: {
          tripId: selectedTrip.id,
          accountType,
          category: mode.row.category,
          description: detail,
          originalAmount: amount,
          originalCurrency: currency,
        },
        trip: selectedTrip,
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
    if (!selectedTrip) throw new Error('Sin viaje seleccionado')

    if (!isValidCustomCategoryName(rawName)) {
      throw new Error('Nombre inválido (máx. 40 caracteres)')
    }
    const name = normalizeCustomCategoryName(rawName)
    const lower = name.toLowerCase()
    const existing = selectedTrip.customCategories.map((c) => c.toLowerCase())
    if (existing.includes(lower)) {
      throw new Error('Esa categoría ya existe')
    }

    await updateTrip({
      tripId: selectedTrip.id,
      input: { customCategories: [...selectedTrip.customCategories, name] },
    })
    toast.success('Categoría agregada')
  }

  const handleRemoveCategory = async () => {
    if (!removeCategoryTarget || !selectedTrip) return
    const row = removeCategoryTarget
    const key = rowKey(row)
    setRemoveCategoryTarget(null)
    setDetailsRow(null)
    setBusyRowKey(key)

    try {
      const lower = (row.description ?? '').toLowerCase()
      const nextCustom = selectedTrip.customCategories.filter(
        (c) => c.toLowerCase() !== lower,
      )
      if (nextCustom.length !== selectedTrip.customCategories.length) {
        await updateTrip({
          tripId: selectedTrip.id,
          input: { customCategories: nextCustom },
        })
      }
      toast.success('Categoría eliminada')
      clearUndo()
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo eliminar la categoría'))
    } finally {
      setBusyRowKey(null)
    }
  }

  const customExpensesForRow = (row: TripCategoryRowModel) =>
    tripExpenses.filter(
      (e) =>
        e.category === TRIP_OTHER_CATEGORY &&
        Boolean(e.description) &&
        e.description!.toLowerCase() === (row.description ?? '').toLowerCase(),
    )

  const canRemoveCustomCategory = (row: TripCategoryRowModel) =>
    row.isOtrosGrande && customExpensesForRow(row).length === 0

  const showCategoryName =
    amountMode?.type === 'create' &&
    amountMode.row.category === TRIP_OTHER_CATEGORY &&
    !amountMode.row.isOtrosGrande

  const showDetail =
    amountMode?.type === 'create' &&
    amountMode.row.category !== TRIP_OTHER_CATEGORY &&
    !amountMode.row.isOtrosGrande

  const defaultCurrency = accountingCurrency

  const handleCreateTrip = async (input: Parameters<typeof createTrip>[0]) => {
    const trip = await createTrip(input)
    setSelectedTripId(trip.id)
    setWizardOpen(false)
    toast.success(`${trip.name} creado`)
  }

  const handleUpdateTrip = async (tripId: string, input: Parameters<typeof updateTrip>[0]['input']) => {
    await updateTrip({ tripId, input })
  }

  const handleCloseTrip = async () => {
    if (!selectedTrip) return
    setCloseTripOpen(true)
  }

  const buildMergeInputs = (
    trip: NonNullable<typeof selectedTrip>,
    options: {
      merge: boolean
      mergeMode?: TripMergeMode
      destination?: MergeDestination
    },
  ) => {
    if (!options.merge || !options.mergeMode || tripExpenses.length === 0 || !settings) {
      return null
    }

    const activePeriod = periods.find((p) => p.status === PeriodStatus.ACTIVE)
    if (!activePeriod) throw new Error('No hay período activo')

    const destination = options.destination ?? 'by_date'
    const mergeMode =
      options.mergeMode === TripMergeMode.INDIVIDUAL && !TRIP_INDIVIDUAL_MERGE_ENABLED
        ? TripMergeMode.AS_TRIP
        : options.mergeMode

    const mergeResult =
      mergeMode === TripMergeMode.AS_TRIP
        ? TripMergeService.buildAsTripInputs(
            trip,
            tripExpenses,
            destination,
            activePeriod.id,
            periods,
            settings,
          )
        : TripMergeService.buildIndividualInputs(
            trip,
            tripExpenses,
            destination,
            activePeriod.id,
            periods,
            settings,
          )

    return {
      ...mergeResult,
      mergeMode,
      destination,
    }
  }

  const executeTripClose = async (options?: {
    merge: boolean
    mergeMode?: TripMergeMode
    destination?: MergeDestination
  }) => {
    if (!selectedTrip || !settings) return
    const trip = selectedTrip
    const repo = getTripRepository()
    const userId = settings.userId

    if (options?.merge && options.mergeMode && tripExpenses.length > 0) {
      const built = buildMergeInputs(trip, options)
      if (!built) throw new Error('No se pudo preparar la fusión')

      const { inputs: mergeInputs, mergeMode } = built

      const createdIds: string[] = []
      const createdExpenses: Expense[] = []
      for (const input of mergeInputs) {
        const created = await createMonthlyExpense(input)
        createdIds.push(created.id)
        createdExpenses.push(created)
      }

      await repo.setMergeData(userId, trip.id, mergeMode, createdIds)
      await refreshMonthlyExpenses()

      const expensesForReconcile = [...monthlyExpenses, ...createdExpenses]
      const reconcilePeriodIds =
        savingsImpactPreview?.reconcilePeriodIds ??
        SavingsReconciliationService.previewTripMergeImpact(
          mergeInputs,
          periods,
          settings,
          monthlyIncomes,
          monthlyExpenses,
        )?.reconcilePeriodIds ??
        []

      if (reconcilePeriodIds.length > 0) {
        await reconcilePeriodsAfterMerge(
          reconcilePeriodIds,
          periods,
          monthlyIncomes,
          expensesForReconcile,
        )
        await refreshPeriods()
      }

      const tripLabel = tripAsCategoryLabel(trip.name)
      const cleanedCustomCategories = settings.customCategories.filter(
        (category) => category.trim().toLowerCase() !== tripLabel.toLowerCase(),
      )
      if (cleanedCustomCategories.length !== settings.customCategories.length) {
        await updateSettings({ customCategories: cleanedCustomCategories })
      }

      await onTripMerged?.({ tripName: trip.name, createdExpenseIds: createdIds })
    }

    const wasLastActiveTrip = activeTrips.length === 1 && activeTrips[0]?.id === trip.id

    await closeTrip(trip.id)
    setCloseTripOpen(false)
    toast.success('Viaje cerrado')

    if (wasLastActiveTrip) {
      await onAllTripsClosed?.()
    }
  }

  const handleTripClosed = async (options?: {
    merge: boolean
    mergeMode?: TripMergeMode
    destination?: MergeDestination
  }) => {
    if (!selectedTrip || !settings) return

    try {
      const destination = options?.destination ?? 'by_date'
      if (
        options?.merge &&
        destination === 'by_date' &&
        tripExpenses.length > 0
      ) {
        const built = buildMergeInputs(selectedTrip, {
          merge: true,
          mergeMode: options.mergeMode,
          destination,
        })
        if (built) {
          const preview = previewTripMergeImpact(
            built.inputs,
            periods,
            monthlyIncomes,
            monthlyExpenses,
          )
          if (preview && preview.months.length > 0) {
            setPendingCloseOptions({
              merge: true,
              mergeMode: built.mergeMode,
              destination,
            })
            setSavingsImpactPreview(preview)
            setCloseTripOpen(false)
            return
          }
        }
      }

      await executeTripClose(options)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Error al cerrar viaje'))
    }
  }

  const handleConfirmSavingsImpact = async () => {
    if (!pendingCloseOptions) return
    setSavingsImpactBusy(true)
    try {
      await executeTripClose(pendingCloseOptions)
      setSavingsImpactPreview(null)
      setPendingCloseOptions(null)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Error al cerrar viaje'))
    } finally {
      setSavingsImpactBusy(false)
    }
  }

  if (tripsLoading) {
    return (
      <p className="py-8 text-center text-[var(--muted)]">Cargando viajes…</p>
    )
  }

  if (tripsError) {
    return (
      <div className="rounded-2xl bg-[var(--warn-bg)] px-4 py-4 text-sm text-[var(--warn-text)]">
        No se pudieron cargar los viajes. Ejecutá la migración SQL en Supabase
        (<code className="text-xs">supabase/migration_trips.sql</code>).
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          className="flex min-h-10 min-w-10 items-center justify-center rounded-xl text-[var(--muted)] active:bg-[var(--press)]"
          aria-label="Configuración del viaje"
          disabled={!selectedTrip}
          onClick={() => setSettingsMenuOpen(true)}
        >
          <SettingsIcon size={20} />
        </button>
        <div className="flex-1">
          <TripSelector
            trips={trips}
            selectedTripId={selectedTripId}
            onSelect={setSelectedTripId}
            onNewTrip={() => setWizardOpen(true)}
            disabled={locked}
          />
        </div>
      </div>

      {selectedTrip && (
        <>
          <TripSummaryCard
            tripName={selectedTrip.name}
            summary={summary}
            color={color}
            progress={progress}
            enabledAccounts={selectedTrip.enabledAccounts}
            accountingCurrency={accountingCurrency}
            displayMode={selectedTrip.budgetMode}
          />

          <div className="mt-4">
            <Tabs
              value={accountType}
              onChange={setAccountType}
              enabledAccounts={selectedTrip.enabledAccounts}
              disabled={locked}
            />
          </div>

          <section className="mt-3 rounded-2xl bg-[var(--surface)] px-3">
            {expensesLoading ? (
              <p className="py-8 text-center text-[var(--muted)]">Cargando…</p>
            ) : (
              <>
                {rows.map((row) => (
                  <TripCategoryRow
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
                <AddCategoryRow disabled={locked} onAdd={handleAddCategory} />
              </>
            )}
          </section>

          <div className="mt-4">
            <Button
              variant="secondary"
              className="w-full"
              disabled={locked}
              onClick={handleCloseTrip}
            >
              Cerrar viaje
            </Button>
          </div>
        </>
      )}

      {!selectedTrip && !wizardOpen && (
        <div className="py-12 text-center">
          <p className="mb-4 text-[var(--muted)]">No hay viajes abiertos</p>
          <Button onClick={() => setWizardOpen(true)}>Nuevo viaje</Button>
        </div>
      )}

      <AmountSheet
        key={
          amountMode
            ? `${amountMode.type}-${rowKey(amountMode.row)}${amountMode.type === 'edit' ? `-${amountMode.expense.id}` : ''}`
            : 'closed'
        }
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
        enabledCurrencies={selectedTrip?.enabledCurrencies ?? [Currency.USD]}
        showCategoryName={showCategoryName}
        showDetail={showDetail}
        accountingCurrency={accountingCurrency}
        exchangeRates={rates}
        activeAccountType={accountType}
        onSubmit={(amount, currency, categoryName) =>
          void handleAmountSubmit(amount, currency, categoryName)
        }
        onCancel={() => setAmountMode(null)}
      />

      <Modal
        open={deleteTarget !== null}
        title="Eliminar movimiento"
        elevated={detailsRow !== null}
        onClose={() => setDeleteTarget(null)}
      >
        <p className="mb-4 text-[var(--muted)]">¿Eliminar el último movimiento?</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>
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
          ¿Eliminar la categoría &quot;{removeCategoryTarget?.label}&quot;?
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setRemoveCategoryTarget(null)}>
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1" onClick={() => void handleRemoveCategory()}>
            Confirmar
          </Button>
        </div>
      </Modal>

      {detailsRow !== null && (
        <Suspense fallback={null}>
          <TripDetailsModal
            open
            row={detailsRow}
            accountType={accountType}
            items={detailsItems}
            totalWhite={detailsAccountTotals.totalWhite}
            totalCash={detailsAccountTotals.totalCash}
            enabledAccounts={selectedTrip?.enabledAccounts ?? []}
            accountingCurrency={accountingCurrency}
            rates={rates}
            onClose={() => setDetailsRow(null)}
            onRemoveCategory={
              detailsRow.isOtrosGrande
                ? () => {
                    const row = detailsRow
                    setDetailsRow(null)
                    setRemoveCategoryTarget(row)
                  }
                : undefined
            }
            onEditExpense={handleEditFromDetails}
            onDeleteExpense={handleDeleteFromDetails}
          />
        </Suspense>
      )}

      {selectedTrip && (
        <TripSettingsSideMenu
          open={settingsMenuOpen}
          trip={selectedTrip}
          onClose={() => setSettingsMenuOpen(false)}
          onUpdate={handleUpdateTrip}
        />
      )}

      {wizardOpen && (
        <Suspense fallback={null}>
          <CreateTripWizard
            open
            onClose={() => setWizardOpen(false)}
            onCreate={handleCreateTrip}
            tripCount={activeTrips.length}
          />
        </Suspense>
      )}

      {closeTripOpen && selectedTrip && settings && (
        <Suspense fallback={null}>
          <CloseTripWizard
            open
            trip={selectedTrip}
            expenses={tripExpenses}
            settings={settings}
            onClose={() => setCloseTripOpen(false)}
            onConfirmClose={handleTripClosed}
          />
        </Suspense>
      )}

      {savingsImpactPreview && (
        <TripSavingsImpactModal
          open
          preview={savingsImpactPreview}
          accountingCurrency={accountingCurrency}
          busy={savingsImpactBusy}
          onConfirm={() => void handleConfirmSavingsImpact()}
          onCancel={() => {
            setSavingsImpactPreview(null)
            setPendingCloseOptions(null)
          }}
        />
      )}

      <UndoBar
        deadline={undoDeadline}
        onUndo={() => void handleUndo()}
        onExpire={clearUndo}
      />
    </>
  )
}
