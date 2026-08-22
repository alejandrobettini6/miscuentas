import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { AddCategoryRow } from '@/components/expenses/AddCategoryRow'
import { CategoryRow } from '@/components/expenses/CategoryRow'
import { ExpenseSearchResultRow } from '@/components/expenses/ExpenseSearchResultRow'
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
const TripPanel = lazy(() =>
  import('@/components/trips/TripPanel').then((m) => ({
    default: m.TripPanel,
  })),
)
const TripHistoryPanel = lazy(() =>
  import('@/components/trips/TripHistoryPanel').then((m) => ({
    default: m.TripHistoryPanel,
  })),
)
const SavingsPanel = lazy(() =>
  import('@/components/savings/SavingsPanel').then((m) => ({
    default: m.SavingsPanel,
  })),
)
import { MonthlySummaryCard } from '@/components/summary/MonthlySummaryCard'
import { IncomePanel } from '@/components/income/IncomePanel'
import { AmountSheet } from '@/components/ui/AmountSheet'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { ViewTabs } from '@/components/ui/ViewTabs'
import { CATEGORY_LABELS, DEFAULT_SETTINGS } from '@/constants/categories'
import { useAuthContext } from '@/contexts/AuthContext'
import { useSettingsContext } from '@/contexts/SettingsContext'
import { useAmountsVisibility } from '@/hooks/useAmountsVisibility'
import { useExpenses } from '@/hooks/useExpenses'
import { useIncomes } from '@/hooks/useIncomes'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { usePeriods } from '@/hooks/usePeriods'
import { useSummary } from '@/hooks/useSummary'
import { useTrips } from '@/hooks/useTrips'
import { getTripRepository } from '@/repositories'
import { CategoryAggregator } from '@/services/CategoryAggregator'
import { ExpenseSearchService } from '@/services/ExpenseSearchService'
import {
  collectMergedExpenseIds,
  isMergedExpense,
} from '@/services/MergedExpenseGuard'
import {
  buildCategoryBreakdown,
  findMergedTripForCategoryRow,
  type TripCategoryBreakdownItem,
} from '@/services/TripMergedBreakdownService'
import { tripAsCategoryLabel } from '@/services/TripCategoryMapper'
import { VisibilityProjector } from '@/services/VisibilityProjector'
import { SavingsService } from '@/services/SavingsService'
import { resolveAccountingCurrency } from '@/services/AccountingCurrency'
import { ClosePeriodSavingsModal } from '@/components/savings/ClosePeriodSavingsModal'
import { useSavings } from '@/hooks/useSavings'
import { categoryRowScrollKey } from '@/utils/categoryScrollKey'
import { AccountType, Category, Currency, MonthMode, PeriodStatus, SummaryDisplayMode, ViewMode } from '@/types/enums'
import type { CategoryRow as CategoryRowModel, Expense, Period } from '@/types/models'
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
  const { user } = useAuthContext()
  const { settings, updateSettings } = useSettingsContext()
  const {
    expenses: allExpenses,
    isLoading,
    createExpense,
    updateExpense,
    removeExpense,
    isMutating: isExpenseMutating,
    refresh: refreshExpenses,
  } = useExpenses()
  const {
    incomes: allIncomes,
    isLoading: isIncomesLoading,
    createIncome,
    updateIncome,
    removeIncome,
    isMutating: isIncomeMutating,
    refresh: refreshIncomes,
  } = useIncomes()
  const {
    periods,
    activePeriod,
    closePeriod,
    isClosing,
    advanceNextPeriod,
    isAdvancing,
    refresh: refreshPeriods,
  } = usePeriods()
  const { trips } = useTrips()
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

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.EXPENSES)
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
  const [searchQueries, setSearchQueries] = useState<Record<AccountType, string>>({
    [AccountType.WHITE]: '',
    [AccountType.CASH]: '',
  })
  const [tripHistoryOpen, setTripHistoryOpen] = useState(false)
  const [savingsPanelOpen, setSavingsPanelOpen] = useState(false)
  const [closeSavingsFlow, setCloseSavingsFlow] = useState<{
    mode: 'beforeClose' | 'catchUp'
    period: Period
    amount: number
  } | null>(null)
  const [closeSavingsBusy, setCloseSavingsBusy] = useState(false)
  const { applyPeriodSavings } = useSavings()
  const [tripBreakdown, setTripBreakdown] = useState<TripCategoryBreakdownItem[] | null>(
    null,
  )
  const [tripBreakdownLoading, setTripBreakdownLoading] = useState(false)
  const [highlightCategoryKey, setHighlightCategoryKey] = useState<string | null>(null)
  const [pendingMergeScroll, setPendingMergeScroll] = useState<{
    scrollKey: string
    createdExpenseIds: string[]
  } | null>(null)

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

  const mergedExpenseIds = useMemo(() => collectMergedExpenseIds(trips), [trips])

  const isTripMergedExpense = useCallback(
    (expenseId: string) => isMergedExpense(expenseId, mergedExpenseIds),
    [mergedExpenseIds],
  )

  const visibleExpenses = useMemo(() => {
    if (!settings || !selectedPeriod) return []
    return VisibilityProjector.projectPeriod(
      allExpenses,
      settings,
      selectedPeriod.id,
    )
  }, [allExpenses, settings, selectedPeriod])

  const customCategories = settings?.customCategories ?? []

  const { summary, color, progress, rows, accountingCurrency, rates } = useSummary(
    visibleExpenses,
    accountType,
  )

  const activeSearchQuery = searchQueries[accountType]
  const isSearching = activeSearchQuery.trim().length > 0

  const searchResults = useMemo(() => {
    if (!isSearching) return []
    return ExpenseSearchService.search({
      query: activeSearchQuery,
      rows,
      expenses: visibleExpenses,
      accountType,
      customCategories,
      accountingCurrency,
      rates,
    })
  }, [
    isSearching,
    activeSearchQuery,
    rows,
    visibleExpenses,
    accountType,
    customCategories,
    accountingCurrency,
    rates,
  ])

  const rowKey = useCallback(
    (row: CategoryRowModel) => `${row.category}:${row.description ?? ''}`,
    [],
  )

  const locked = isExpenseMutating || isIncomeMutating || isClosing || busyRowKey !== null || isReadOnly
  const isLoadingData = isLoading || isIncomesLoading

  const handleRequestClosePeriod = useCallback(async (): Promise<boolean> => {
    if (!settings || !activePeriod) return false

    const savings = SavingsService.calculatePeriodSavings(
      activePeriod.id,
      settings,
      allIncomes,
      allExpenses,
    )

    if (!SavingsService.isPeriodSavingsComplete(activePeriod)) {
      setCloseSavingsFlow({
        mode: 'beforeClose',
        period: activePeriod,
        amount: savings,
      })
      return false
    }

    await closePeriod()
    await refreshPeriods()
    return true
  }, [
    activePeriod,
    allExpenses,
    allIncomes,
    closePeriod,
    refreshPeriods,
    settings,
  ])

  const handleCloseSavingsConfirm = useCallback(
    async (locationName: string) => {
      if (!closeSavingsFlow) return
      setCloseSavingsBusy(true)
      try {
        await applyPeriodSavings(
          closeSavingsFlow.period,
          closeSavingsFlow.amount,
          locationName,
        )
        if (closeSavingsFlow.mode === 'beforeClose') {
          await closePeriod()
        }
        await refreshPeriods()
        toast.success(
          closeSavingsFlow.mode === 'beforeClose'
            ? 'Mes cerrado'
            : 'Ahorro asignado',
        )
        setCloseSavingsFlow(null)
      } catch (error) {
        toast.error(getErrorMessage(error, 'No se pudo asignar el ahorro'))
      } finally {
        setCloseSavingsBusy(false)
      }
    },
    [applyPeriodSavings, closePeriod, closeSavingsFlow, refreshPeriods],
  )

  useEffect(() => {
    if (!settings || isLoadingData || closeSavingsFlow) return

    const pending = [...periods]
      .filter(
        (period) =>
          period.status === PeriodStatus.CLOSED &&
          !SavingsService.isPeriodSavingsComplete(period),
      )
      .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))[0]

    if (!pending) return

    setCloseSavingsFlow({
      mode: 'catchUp',
      period: pending,
      amount: SavingsService.calculatePeriodSavings(
        pending.id,
        settings,
        allIncomes,
        allExpenses,
      ),
    })
  }, [
    allExpenses,
    allIncomes,
    closeSavingsFlow,
    isLoadingData,
    periods,
    settings,
  ])

  const handleRegisterRow = useCallback(
    (row: CategoryRowModel) => {
      if (isReadOnly) return
      setAmountMode({ type: 'create', row })
    },
    [isReadOnly],
  )

  const handleEditRow = useCallback(
    (row: CategoryRowModel) => {
      if (isReadOnly || !row.lastExpense || isTripMergedExpense(row.lastExpense.id)) return
      setAmountMode({ type: 'edit', row, expense: row.lastExpense })
    },
    [isReadOnly, isTripMergedExpense],
  )

  const handleDeleteRow = useCallback(
    (row: CategoryRowModel) => {
      if (isReadOnly || !row.lastExpense || isTripMergedExpense(row.lastExpense.id)) return
      setDeleteTarget(row.lastExpense)
    },
    [isReadOnly, isTripMergedExpense],
  )

  const handleEditSearchResult = useCallback(
    (row: CategoryRowModel, expense: Expense) => {
      if (isReadOnly || isTripMergedExpense(expense.id)) return
      setAmountMode({ type: 'edit', row, expense })
    },
    [isReadOnly, isTripMergedExpense],
  )

  const handleDeleteSearchResult = useCallback(
    (expense: Expense) => {
      if (isReadOnly || isTripMergedExpense(expense.id)) return
      setDeleteTarget(expense)
    },
    [isReadOnly, isTripMergedExpense],
  )

  const searchResultKey = useCallback(
    (result: (typeof searchResults)[number]) =>
      result.kind === 'category'
        ? rowKey(result.row)
        : `${rowKey(result.row)}:${result.expense.id}`,
    [rowKey],
  )

  const handleViewDetailsRow = useCallback((row: CategoryRowModel) => {
    setDetailsRow(row)
  }, [])

  const mergedTripForDetails = useMemo(() => {
    if (!detailsRow) return null
    return findMergedTripForCategoryRow(detailsRow, trips)
  }, [detailsRow, trips])

  useEffect(() => {
    if (!detailsRow || !mergedTripForDetails || !user) {
      setTripBreakdown(null)
      setTripBreakdownLoading(false)
      return
    }

    let cancelled = false
    setTripBreakdownLoading(true)

    void getTripRepository()
      .listExpenses(user.id, mergedTripForDetails.id)
      .then((expenses) => {
        if (cancelled) return
        setTripBreakdown(buildCategoryBreakdown(expenses, accountingCurrency, rates))
      })
      .catch(() => {
        if (!cancelled) setTripBreakdown([])
      })
      .finally(() => {
        if (!cancelled) setTripBreakdownLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [detailsRow, mergedTripForDetails, user, accountingCurrency, rates])

  const tripBreakdownTotals = useMemo(() => {
    if (!tripBreakdown?.length) {
      return { totalWhite: 0, totalCash: 0 }
    }
    return tripBreakdown.reduce(
      (acc, item) => ({
        totalWhite: acc.totalWhite + item.totalWhite,
        totalCash: acc.totalCash + item.totalCash,
      }),
      { totalWhite: 0, totalCash: 0 },
    )
  }, [tripBreakdown])

  const handleTripMerged = useCallback(
    async ({
      tripName,
      createdExpenseIds,
    }: {
      tripName: string
      createdExpenseIds: string[]
    }) => {
      setViewMode(ViewMode.EXPENSES)
      setPendingMergeScroll({
        scrollKey: `otros-grande:${tripAsCategoryLabel(tripName).toLowerCase()}`,
        createdExpenseIds,
      })
      await refreshExpenses()
    },
    [refreshExpenses],
  )

  useEffect(() => {
    if (!pendingMergeScroll || viewMode !== ViewMode.EXPENSES || isLoadingData) return

    const { scrollKey, createdExpenseIds } = pendingMergeScroll
    const periodId = selectedPeriod?.id
    const inActivePeriod =
      Boolean(periodId) &&
      createdExpenseIds.some((id) =>
        allExpenses.some((e) => e.id === id && e.periodId === periodId),
      )

    if (!inActivePeriod) {
      toast(
        'El gasto del viaje quedó en otro mes. Cambiá el período para verlo.',
      )
    }

    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-scroll-key="${scrollKey}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setHighlightCategoryKey(scrollKey)
        window.setTimeout(() => setHighlightCategoryKey(null), 2000)
      }
    })

    setPendingMergeScroll(null)
  }, [pendingMergeScroll, viewMode, isLoadingData, allExpenses, selectedPeriod?.id, rows])

  const handleEditExpenseFromDetails = useCallback(
    (expense: Expense) => {
      if (isReadOnly || !detailsRow || isTripMergedExpense(expense.id)) return
      const row = detailsRow
      setDetailsRow(null)
      setAmountMode({ type: 'edit', row, expense })
    },
    [isReadOnly, detailsRow, isTripMergedExpense],
  )

  const handleDeleteExpenseFromDetails = useCallback(
    (expense: Expense) => {
      if (isReadOnly || isTripMergedExpense(expense.id)) return
      setDeleteTarget(expense)
    },
    [isReadOnly, isTripMergedExpense],
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
      customCategories,
    )
  }, [detailsRow, visibleExpenses, accountType, customCategories])

  const detailsAccountTotals = useMemo(() => {
    if (!detailsRow) return { totalWhite: 0, totalCash: 0 }
    return CategoryAggregator.accountTotalsForRow(
      visibleExpenses,
      detailsRow,
      accountingCurrency,
      rates,
      customCategories,
    )
  }, [detailsRow, visibleExpenses, accountingCurrency, rates, customCategories])

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

    if (mode.type === 'edit' && isTripMergedExpense(mode.expense.id)) {
      toast.error('Este gasto proviene de un viaje cerrado y no se puede editar')
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
    if (!deleteTarget || isReadOnly || isTripMergedExpense(deleteTarget.id)) return
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

      <div className="mb-4">
        <ViewTabs
          value={viewMode}
          onChange={setViewMode}
          disabled={locked && !isReadOnly}
          showTrips
        />
      </div>

      {viewMode === ViewMode.TRIPS ? (
        <Suspense fallback={<p className="py-8 text-center text-[var(--muted)]">Cargando…</p>}>
          <TripPanel
            onAllTripsClosed={() => setViewMode(ViewMode.EXPENSES)}
            onTripMerged={handleTripMerged}
          />
        </Suspense>
      ) : viewMode === ViewMode.INCOME && settings && selectedPeriod ? (
        <IncomePanel
          incomes={allIncomes}
          expenses={visibleExpenses}
          settings={settings}
          periodId={selectedPeriod.id}
          enabledAccounts={enabledAccounts}
          enabledCurrencies={enabledCurrencies}
          isReadOnly={isReadOnly}
          isMutating={isIncomeMutating}
          amountsHidden={amountsHidden}
          onToggleAmounts={toggleAmountsHidden}
          onCreateIncome={createIncome}
          onUpdateIncome={(incomeId, input) => updateIncome({ incomeId, input })}
          onRemoveIncome={removeIncome}
        />
      ) : (
        <>
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

      <div className="mt-3">
        <input
          type="search"
          value={activeSearchQuery}
          placeholder="Buscar categoría o gasto…"
          disabled={isLoadingData}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-base outline-none focus:border-[var(--blue)] disabled:opacity-50"
          onChange={(event) =>
            setSearchQueries((prev) => ({
              ...prev,
              [accountType]: event.target.value,
            }))
          }
        />
      </div>

      <section className="mt-2 rounded-2xl bg-[var(--surface)] px-3">
        {isLoadingData ? (
          <p className="py-8 text-center text-[var(--muted)]">Cargando…</p>
        ) : isSearching ? (
          searchResults.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              Sin resultados para «{activeSearchQuery.trim()}»
            </p>
          ) : (
            searchResults.map((result) => (
              <ExpenseSearchResultRow
                key={searchResultKey(result)}
                result={result}
                accountingCurrency={accountingCurrency}
                rates={rates}
                disabled={locked}
                lockedExpenseIds={mergedExpenseIds}
                canRemoveCategory={
                  result.kind === 'category'
                    ? canRemoveCustomCategory(result.row)
                    : false
                }
                onRegister={handleRegisterRow}
                onEdit={handleEditSearchResult}
                onDelete={handleDeleteSearchResult}
                onViewDetails={handleViewDetailsRow}
                onRemoveCategory={handleRemoveCategoryRow}
              />
            ))
          )
        ) : (
          <>
            {rows.map((row) => (
              <CategoryRow
                key={rowKey(row)}
                row={row}
                accountingCurrency={accountingCurrency}
                rates={rates}
                disabled={locked}
                scrollKey={categoryRowScrollKey(row)}
                highlighted={highlightCategoryKey === categoryRowScrollKey(row)}
                lastExpenseLocked={
                  row.lastExpense ? isTripMergedExpense(row.lastExpense.id) : false
                }
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
        </>
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
        elevated={detailsRow !== null}
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
        allIncomes={allIncomes}
        periods={periods}
        monthMode={settings?.monthMode ?? MonthMode.AUTOMATIC}
        tripsModuleEnabled={settings?.tripsModuleEnabled ?? false}
        onClose={() => setMenuOpen(false)}
        onRequestClosePeriod={handleRequestClosePeriod}
        onOpenSettings={() => {
          setMenuOpen(false)
          requestAnimationFrame(() => setSettingsOpen(true))
        }}
        onOpenOnboarding={() => {
          setOnboardingMode('reconfigure')
          setOnboardingOpen(true)
        }}
        onOpenImport={() => setImportOpen(true)}
        onOpenCardStatementImport={() => setImportStatementOpen(true)}
        onToggleTripsModule={async () => {
          if (!settings) return
          try {
            const next = !settings.tripsModuleEnabled
            await updateSettings({ tripsModuleEnabled: next })
            toast.success(next ? 'Módulo de viajes activado' : 'Módulo de viajes desactivado')
            if (!next && viewMode === ViewMode.TRIPS) {
              setViewMode(ViewMode.EXPENSES)
            }
          } catch (error) {
            toast.error(getErrorMessage(error, 'No se pudo actualizar el módulo de viajes'))
          }
        }}
        onOpenTripHistory={() => setTripHistoryOpen(true)}
        onOpenSavings={() => setSavingsPanelOpen(true)}
      />

      {detailsRow !== null && (
        <Suspense fallback={null}>
          <CategoryDetailsModal
            open
            row={detailsRow}
            accountType={accountType}
            items={detailsItems}
            totalWhite={
              mergedTripForDetails && tripBreakdown
                ? tripBreakdownTotals.totalWhite
                : detailsAccountTotals.totalWhite
            }
            totalCash={
              mergedTripForDetails && tripBreakdown
                ? tripBreakdownTotals.totalCash
                : detailsAccountTotals.totalCash
            }
            enabledAccounts={enabledAccounts}
            accountingCurrency={accountingCurrency}
            rates={rates}
            isReadOnly={isReadOnly}
            lockedExpenseIds={mergedExpenseIds}
            tripBreakdown={mergedTripForDetails ? tripBreakdown : null}
            tripBreakdownLoading={mergedTripForDetails ? tripBreakdownLoading : false}
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
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[55] flex items-center justify-center bg-[var(--overlay)]">
              <p className="rounded-xl bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
                Cargando configuración…
              </p>
            </div>
          }
        >
          <SettingsPanel
            open={settingsOpen}
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
            incomes={allIncomes}
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
            incomes={allIncomes}
            periods={periods}
            onClose={() => setImportOpen(false)}
            onImported={async () => {
              await refreshPeriods()
              await refreshExpenses()
              await refreshIncomes()
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
            removeExpense={removeExpense}
            updateSettings={updateSettings}
          />
        </Suspense>
      )}

      {tripHistoryOpen && (
        <Suspense fallback={null}>
          <TripHistoryPanel
            open
            onClose={() => setTripHistoryOpen(false)}
            onTripReopened={async () => {
              if (!settings?.tripsModuleEnabled) {
                await updateSettings({ tripsModuleEnabled: true })
              }
              setViewMode(ViewMode.TRIPS)
            }}
          />
        </Suspense>
      )}

      {savingsPanelOpen && (
        <Suspense fallback={null}>
          <SavingsPanel open onClose={() => setSavingsPanelOpen(false)} />
        </Suspense>
      )}

      {closeSavingsFlow && settings && (
        <ClosePeriodSavingsModal
          open
          amount={closeSavingsFlow.amount}
          periodLabel={closeSavingsFlow.period.label}
          locations={settings.savingsLocations}
          accountingCurrency={resolveAccountingCurrency(settings)}
          busy={closeSavingsBusy || isClosing}
          onConfirm={(locationName) => void handleCloseSavingsConfirm(locationName)}
          onCancel={() => setCloseSavingsFlow(null)}
        />
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
