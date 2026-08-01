import { useCallback, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { IncomeDetailsModal } from '@/components/income/IncomeDetailsModal'
import { IncomeRow } from '@/components/income/IncomeRow'
import { IncomeSummaryCard } from '@/components/income/IncomeSummaryCard'
import { AmountSheet } from '@/components/ui/AmountSheet'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useIncomeSummary } from '@/hooks/useIncomeSummary'
import { IncomeAggregator } from '@/services/IncomeAggregator'
import { normalizeIncomeDescription } from '@/services/IncomeService'
import {
  resolveAccountingCurrency,
  type ExchangeRates,
} from '@/services/AccountingCurrency'
import { AccountType, Currency } from '@/types/enums'
import type {
  CreateIncomeInput,
  Expense,
  Income,
  IncomeRow as IncomeRowModel,
  Settings,
  UpdateIncomeInput,
} from '@/types/models'
import { getErrorMessage } from '@/utils/errors'
import { parseAmountInput } from '@/validators/amount'

interface IncomePanelProps {
  incomes: Income[]
  expenses: Expense[]
  settings: Settings
  periodId: string
  enabledAccounts: AccountType[]
  enabledCurrencies: Currency[]
  isReadOnly?: boolean
  isMutating?: boolean
  amountsHidden?: boolean
  onToggleAmounts?: () => void
  onCreateIncome: (input: CreateIncomeInput) => Promise<unknown>
  onUpdateIncome: (incomeId: string, input: UpdateIncomeInput) => Promise<unknown>
  onRemoveIncome: (incomeId: string) => Promise<unknown>
}

type AmountMode =
  | { type: 'create'; row: IncomeRowModel }
  | { type: 'edit'; row: IncomeRowModel; income: Income }
  | null

export function IncomePanel({
  incomes,
  expenses,
  settings,
  periodId,
  enabledAccounts,
  enabledCurrencies,
  isReadOnly = false,
  isMutating = false,
  amountsHidden = false,
  onToggleAmounts,
  onCreateIncome,
  onUpdateIncome,
  onRemoveIncome,
}: IncomePanelProps) {
  const [amountMode, setAmountMode] = useState<AmountMode>(null)
  const [detailsRow, setDetailsRow] = useState<IncomeRowModel | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Income | null>(null)

  const periodIncomes = useMemo(
    () => incomes.filter((income) => income.periodId === periodId),
    [incomes, periodId],
  )

  const accountingCurrency = resolveAccountingCurrency(settings)
  const rates: ExchangeRates = {
    usdWhite: settings.usdWhite,
    usdCash: settings.usdCash,
  }

  const rows = useMemo(
    () =>
      IncomeAggregator.buildRows(
        periodIncomes,
        enabledAccounts,
        accountingCurrency,
        rates,
      ),
    [periodIncomes, enabledAccounts, accountingCurrency, rates],
  )

  const summary = useIncomeSummary(periodIncomes, expenses)
  const locked = isReadOnly || isMutating

  const rowKey = useCallback((row: IncomeRowModel) => row.accountType, [])

  const incomesForRow = useCallback(
    (row: IncomeRowModel) => IncomeAggregator.incomesForRow(periodIncomes, row),
    [periodIncomes],
  )

  const detailsItems = useMemo(() => {
    if (!detailsRow) return []
    return incomesForRow(detailsRow)
  }, [detailsRow, incomesForRow])

  const detailsTotal = useMemo(() => {
    if (!detailsRow) return 0
    return detailsRow.totalUsd
  }, [detailsRow])

  const handleRegisterRow = useCallback(
    (row: IncomeRowModel) => {
      if (locked) return
      setAmountMode({ type: 'create', row })
    },
    [locked],
  )

  const handleEditRow = useCallback(
    (row: IncomeRowModel) => {
      if (locked || !row.lastIncome) return
      setAmountMode({ type: 'edit', row, income: row.lastIncome })
    },
    [locked],
  )

  const handleDeleteRow = useCallback(
    (row: IncomeRowModel) => {
      if (locked || !row.lastIncome) return
      setDeleteTarget(row.lastIncome)
    },
    [locked],
  )

  const handleViewDetailsRow = useCallback((row: IncomeRowModel) => {
    setDetailsRow(row)
  }, [])

  const handleEditIncomeFromDetails = useCallback(
    (income: Income) => {
      if (locked || !detailsRow) return
      const row = detailsRow
      setDetailsRow(null)
      setAmountMode({ type: 'edit', row, income })
    },
    [locked, detailsRow],
  )

  const handleDeleteIncomeFromDetails = useCallback(
    (income: Income) => {
      if (locked) return
      setDeleteTarget(income)
    },
    [locked],
  )

  const handleAmountSubmit = async (
    rawAmount: string,
    currency: Currency,
    detail?: string,
  ) => {
    if (!amountMode || locked) {
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

    let description = ''
    try {
      description = normalizeIncomeDescription(detail)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Detalle inválido'))
      return
    }

    const accountType = mode.row.accountType

    try {
      if (mode.type === 'edit') {
        await onUpdateIncome(mode.income.id, {
          accountType,
          description,
          originalAmount: amount,
          originalCurrency: currency,
        })
        toast.success('Ingreso actualizado')
        return
      }

      await onCreateIncome({
        periodId,
        accountType,
        description,
        originalAmount: amount,
        originalCurrency: currency,
      })
      toast.success('Ingreso registrado')
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo guardar el ingreso'))
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await onRemoveIncome(deleteTarget.id)
      setDeleteTarget(null)
      toast.success('Ingreso eliminado')
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo eliminar'))
    }
  }

  const editIncome = amountMode?.type === 'edit' ? amountMode.income : null
  const amountSheetKey = amountMode
    ? `${amountMode.type}-${rowKey(amountMode.row)}${amountMode.type === 'edit' ? `-${amountMode.income.id}` : ''}`
    : 'closed'

  return (
    <>
      <IncomeSummaryCard
        summary={summary}
        enabledAccounts={enabledAccounts}
        accountingCurrency={accountingCurrency}
        amountsHidden={amountsHidden}
        onToggleAmounts={onToggleAmounts}
      />

      <section className="mt-4 rounded-2xl bg-[var(--surface)] px-3">
        {rows.map((row) => (
          <IncomeRow
            key={rowKey(row)}
            row={row}
            accountingCurrency={accountingCurrency}
            rates={rates}
            disabled={locked}
            onRegister={handleRegisterRow}
            onEdit={handleEditRow}
            onDelete={handleDeleteRow}
            onViewDetails={handleViewDetailsRow}
          />
        ))}
      </section>

      <AmountSheet
        key={amountSheetKey}
        open={amountMode !== null}
        title={
          amountMode?.type === 'edit'
            ? `Editar ${amountMode.row.label}`
            : amountMode
              ? amountMode.row.label
              : ''
        }
        initialAmount={editIncome ? String(editIncome.originalAmount) : ''}
        initialCurrency={editIncome?.originalCurrency ?? accountingCurrency}
        initialDetail={editIncome?.description ?? ''}
        enabledCurrencies={enabledCurrencies}
        showIncomeDetail
        onSubmit={(amount, currency, detail) =>
          void handleAmountSubmit(amount, currency, detail)
        }
        onCancel={() => setAmountMode(null)}
      />

      <IncomeDetailsModal
        open={detailsRow !== null}
        row={detailsRow}
        items={detailsItems}
        total={detailsTotal}
        accountingCurrency={accountingCurrency}
        rates={rates}
        isReadOnly={isReadOnly}
        onClose={() => setDetailsRow(null)}
        onEditIncome={handleEditIncomeFromDetails}
        onDeleteIncome={handleDeleteIncomeFromDetails}
      />

      <Modal
        open={deleteTarget !== null}
        title="Eliminar ingreso"
        elevated={detailsRow !== null}
        onClose={() => setDeleteTarget(null)}
      >
        <p className="mb-4 text-[var(--muted)]">¿Eliminar este ingreso?</p>
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
    </>
  )
}
