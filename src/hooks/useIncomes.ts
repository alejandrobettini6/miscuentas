import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '@/contexts/AuthContext'
import { useSettingsContext } from '@/contexts/SettingsContext'
import { getIncomeRepository } from '@/repositories'
import { OfflineOperationType } from '@/types/enums'
import type { CreateIncomeInput, UpdateIncomeInput } from '@/types/models'
import { offlineQueue } from '@/repositories/offline/OfflineQueue'
import { queryKeys } from './queryKeys'

export function useIncomes() {
  const { user } = useAuthContext()
  const { settings } = useSettingsContext()
  const queryClient = useQueryClient()
  const repo = getIncomeRepository()
  const userId = user?.id ?? ''

  const incomesQuery = useQuery({
    queryKey: queryKeys.incomes(userId),
    queryFn: () => repo.list(userId),
    enabled: Boolean(userId),
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.incomes(userId) })
  }

  const createMutation = useMutation({
    mutationFn: async (input: CreateIncomeInput) => {
      if (!user || !settings) throw new Error('No autenticado')
      try {
        return await repo.create(user.id, input, settings)
      } catch (error) {
        if (!navigator.onLine) {
          offlineQueue.enqueue(OfflineOperationType.CREATE_INCOME, {
            userId: user.id,
            input,
          })
        }
        throw error
      }
    },
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      incomeId,
      input,
    }: {
      incomeId: string
      input: UpdateIncomeInput
    }) => {
      if (!user || !settings) throw new Error('No autenticado')
      try {
        return await repo.update(user.id, incomeId, input, settings)
      } catch (error) {
        if (!navigator.onLine) {
          offlineQueue.enqueue(OfflineOperationType.UPDATE_INCOME, {
            userId: user.id,
            incomeId,
            input,
          })
        }
        throw error
      }
    },
    onSuccess: invalidate,
  })

  const removeMutation = useMutation({
    mutationFn: async (incomeId: string) => {
      if (!user) throw new Error('No autenticado')
      try {
        return await repo.remove(user.id, incomeId)
      } catch (error) {
        if (!navigator.onLine) {
          offlineQueue.enqueue(OfflineOperationType.DELETE_INCOME, {
            userId: user.id,
            incomeId,
          })
        }
        throw error
      }
    },
    onSuccess: invalidate,
  })

  return {
    incomes: incomesQuery.data ?? [],
    isLoading: incomesQuery.isLoading,
    createIncome: createMutation.mutateAsync,
    updateIncome: updateMutation.mutateAsync,
    removeIncome: removeMutation.mutateAsync,
    refresh: invalidate,
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      removeMutation.isPending,
  }
}
