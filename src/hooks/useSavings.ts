import { useCallback, useMemo } from 'react'
import { useSettingsContext } from '@/contexts/SettingsContext'
import { useAuthContext } from '@/contexts/AuthContext'
import { getPeriodRepository } from '@/repositories'
import { SavingsService } from '@/services/SavingsService'
import { SavingsSummaryCalculator } from '@/services/SavingsSummaryCalculator'
import {
  SavingsReconciliationService,
  type TripSavingsImpactPreview,
} from '@/services/SavingsReconciliationService'
import type { Expense, Income, Period, Settings } from '@/types/models'

export function useSavings() {
  const { user } = useAuthContext()
  const { settings, updateSettings } = useSettingsContext()
  const periodRepo = getPeriodRepository()

  const summary = useMemo(
    () => (settings ? SavingsSummaryCalculator.calculate(settings) : null),
    [settings],
  )

  const persistSettings = useCallback(
    async (next: Settings) => {
      await updateSettings({
        savingsLocations: next.savingsLocations,
        savingsBalances: next.savingsBalances,
      })
    },
    [updateSettings],
  )

  const addLocation = useCallback(
    async (name: string) => {
      if (!settings) throw new Error('Sin configuración')
      const next = SavingsService.addLocation(settings, name)
      await persistSettings(next)
    },
    [persistSettings, settings],
  )

  const renameLocation = useCallback(
    async (oldName: string, newName: string) => {
      if (!settings) throw new Error('Sin configuración')
      const next = SavingsService.renameLocation(settings, oldName, newName)
      await persistSettings(next)
    },
    [persistSettings, settings],
  )

  const removeLocation = useCallback(
    async (name: string) => {
      if (!settings) throw new Error('Sin configuración')
      const next = SavingsService.removeLocation(settings, name)
      await persistSettings(next)
    },
    [persistSettings, settings],
  )

  const setLocationBalance = useCallback(
    async (name: string, amount: number) => {
      if (!settings) throw new Error('Sin configuración')
      const next = SavingsService.setLocationBalance(settings, name, amount)
      await persistSettings(next)
    },
    [persistSettings, settings],
  )

  const applyPeriodSavings = useCallback(
    async (period: Period, amount: number, locationName: string) => {
      if (!settings || !user) throw new Error('Sin configuración')
      const result = SavingsService.applyPeriodSavings(
        settings,
        period,
        amount,
        locationName,
      )
      await persistSettings(result.settings)
      await periodRepo.update(user.id, result.period)
      return result
    },
    [persistSettings, periodRepo, settings, user],
  )

  const reconcilePeriodsAfterMerge = useCallback(
    async (
      periodIds: string[],
      periods: Period[],
      incomes: Income[],
      expenses: Expense[],
    ) => {
      if (!settings || !user || periodIds.length === 0) return

      const result = SavingsReconciliationService.reconcilePeriods(
        settings,
        periods,
        periodIds,
        incomes,
        expenses,
      )

      await persistSettings(result.settings)

      for (const periodId of periodIds) {
        const updated = result.periods.find((period) => period.id === periodId)
        if (updated) {
          await periodRepo.update(user.id, updated)
        }
      }
    },
    [persistSettings, periodRepo, settings, user],
  )

  const previewTripMergeImpact = useCallback(
    (
      mergeInputs: Parameters<typeof SavingsReconciliationService.previewTripMergeImpact>[0],
      periods: Period[],
      incomes: Income[],
      expenses: Expense[],
    ): TripSavingsImpactPreview | null => {
      if (!settings) return null
      return SavingsReconciliationService.previewTripMergeImpact(
        mergeInputs,
        periods,
        settings,
        incomes,
        expenses,
      )
    },
    [settings],
  )

  return {
    settings,
    summary,
    addLocation,
    renameLocation,
    removeLocation,
    setLocationBalance,
    applyPeriodSavings,
    reconcilePeriodsAfterMerge,
    previewTripMergeImpact,
  }
}
