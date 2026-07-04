import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '@/contexts/AuthContext'
import { useSettingsContext } from '@/contexts/SettingsContext'
import { getExpenseRepository } from '@/repositories'
import { OfflineOperationType } from '@/types/enums'
import type { CreateExpenseInput, UpdateExpenseInput } from '@/types/models'
import { offlineQueue } from '@/repositories/offline/OfflineQueue'
import { queryKeys } from './queryKeys'

export function useExpenses() {
  const { user } = useAuthContext()
  const { settings } = useSettingsContext()
  const queryClient = useQueryClient()
  const repo = getExpenseRepository()
  const userId = user?.id ?? ''

  const expensesQuery = useQuery({
    queryKey: queryKeys.expenses(userId),
    queryFn: () => repo.list(userId),
    enabled: Boolean(userId),
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.expenses(userId) })
  }

  const createMutation = useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      if (!user || !settings) throw new Error('No autenticado')
      try {
        return await repo.create(user.id, input, settings)
      } catch (error) {
        if (!navigator.onLine) {
          offlineQueue.enqueue(OfflineOperationType.CREATE_EXPENSE, {
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
      expenseId,
      input,
    }: {
      expenseId: string
      input: UpdateExpenseInput
    }) => {
      if (!user || !settings) throw new Error('No autenticado')
      return repo.update(user.id, expenseId, input, settings)
    },
    onSuccess: invalidate,
  })

  const removeMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      if (!user) throw new Error('No autenticado')
      return repo.remove(user.id, expenseId)
    },
    onSuccess: invalidate,
  })

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No autenticado')
      return repo.resetMonth(user.id)
    },
    onSuccess: invalidate,
  })

  return {
    expenses: expensesQuery.data ?? [],
    isLoading: expensesQuery.isLoading,
    createExpense: createMutation.mutateAsync,
    updateExpense: updateMutation.mutateAsync,
    removeExpense: removeMutation.mutateAsync,
    resetMonth: resetMutation.mutateAsync,
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      removeMutation.isPending ||
      resetMutation.isPending,
  }
}
