import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '@/contexts/AuthContext'
import { useSettingsContext } from '@/contexts/SettingsContext'
import { getPeriodRepository } from '@/repositories'
import { MonthMode, PeriodStatus } from '@/types/enums'
import { queryKeys } from './queryKeys'

export function usePeriods() {
  const { user } = useAuthContext()
  const { settings } = useSettingsContext()
  const queryClient = useQueryClient()
  const repo = getPeriodRepository()
  const userId = user?.id ?? ''

  const periodsQuery = useQuery({
    queryKey: queryKeys.periods(userId, settings?.monthMode, settings?.monthlyLimit),
    queryFn: async () => {
      if (!user || !settings) return []
      if (settings.monthMode === MonthMode.AUTOMATIC) {
        await repo.rolloverIfNeeded(user.id, settings.monthlyLimit)
      } else {
        await repo.ensureActive(user.id, settings.monthlyLimit)
      }
      return repo.list(user.id)
    },
    enabled: Boolean(userId && settings),
  })

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!user || !settings) throw new Error('No autenticado')
      return repo.closeAndOpenNext(user.id, settings.monthlyLimit)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['periods', userId] })
      await queryClient.invalidateQueries({ queryKey: queryKeys.expenses(userId) })
    },
  })

  const periods = periodsQuery.data ?? []
  const activePeriod =
    periods.find((p) => p.status === PeriodStatus.ACTIVE) ?? null

  return {
    periods,
    activePeriod,
    isLoading: periodsQuery.isLoading,
    closePeriod: closeMutation.mutateAsync,
    isClosing: closeMutation.isPending,
    refresh: () =>
      queryClient.invalidateQueries({ queryKey: ['periods', userId] }),
  }
}
