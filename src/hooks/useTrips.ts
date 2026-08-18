import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '@/contexts/AuthContext'
import { useSettingsContext } from '@/contexts/SettingsContext'
import { getTripRepository } from '@/repositories'
import type {
  CreateTripExpenseInput,
  CreateTripInput,
  Trip,
  UpdateTripExpenseInput,
  UpdateTripInput,
} from '@/types/models'
import { queryKeys } from './queryKeys'

export function useTrips() {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()
  const repo = getTripRepository()
  const userId = user?.id ?? ''

  const tripsQuery = useQuery({
    queryKey: queryKeys.trips(userId),
    queryFn: () => repo.listTrips(userId),
    enabled: Boolean(userId),
  })

  const invalidateTrips = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.trips(userId) })
  }

  const createTripMutation = useMutation({
    mutationFn: async (input: CreateTripInput) => {
      if (!user) throw new Error('No autenticado')
      return repo.createTrip(user.id, input)
    },
    onSuccess: invalidateTrips,
  })

  const updateTripMutation = useMutation({
    mutationFn: async ({ tripId, input }: { tripId: string; input: UpdateTripInput }) => {
      if (!user) throw new Error('No autenticado')
      return repo.updateTrip(user.id, tripId, input)
    },
    onSuccess: invalidateTrips,
  })

  const closeTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      if (!user) throw new Error('No autenticado')
      return repo.closeTrip(user.id, tripId)
    },
    onSuccess: invalidateTrips,
  })

  const reopenTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      if (!user) throw new Error('No autenticado')
      return repo.reopenTrip(user.id, tripId)
    },
    onSuccess: invalidateTrips,
  })

  return {
    trips: tripsQuery.data ?? [],
    isLoading: tripsQuery.isLoading,
    error: tripsQuery.error,
    createTrip: createTripMutation.mutateAsync,
    updateTrip: updateTripMutation.mutateAsync,
    closeTrip: closeTripMutation.mutateAsync,
    reopenTrip: reopenTripMutation.mutateAsync,
    refreshTrips: invalidateTrips,
    isMutating:
      createTripMutation.isPending ||
      updateTripMutation.isPending ||
      closeTripMutation.isPending ||
      reopenTripMutation.isPending,
  }
}

export function useTripExpenses(tripId: string | null) {
  const { user } = useAuthContext()
  const { settings } = useSettingsContext()
  const queryClient = useQueryClient()
  const repo = getTripRepository()
  const userId = user?.id ?? ''

  const expensesQuery = useQuery({
    queryKey: queryKeys.tripExpenses(userId, tripId ?? ''),
    queryFn: () => repo.listExpenses(userId, tripId!),
    enabled: Boolean(userId) && Boolean(tripId),
  })

  const invalidate = async () => {
    if (!tripId) return
    await queryClient.invalidateQueries({
      queryKey: queryKeys.tripExpenses(userId, tripId),
    })
  }

  const createMutation = useMutation({
    mutationFn: async ({ input, trip }: { input: CreateTripExpenseInput; trip: Trip }) => {
      if (!user || !settings) throw new Error('No autenticado')
      return repo.createExpense(user.id, input, trip, settings)
    },
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      expenseId,
      input,
      trip,
    }: {
      expenseId: string
      input: UpdateTripExpenseInput
      trip: Trip
    }) => {
      if (!user || !settings) throw new Error('No autenticado')
      return repo.updateExpense(user.id, expenseId, input, trip, settings)
    },
    onSuccess: invalidate,
  })

  const removeMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      if (!user) throw new Error('No autenticado')
      return repo.removeExpense(user.id, expenseId)
    },
    onSuccess: invalidate,
  })

  return {
    expenses: expensesQuery.data ?? [],
    isLoading: expensesQuery.isLoading,
    createExpense: createMutation.mutateAsync,
    updateExpense: updateMutation.mutateAsync,
    removeExpense: removeMutation.mutateAsync,
    refresh: invalidate,
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      removeMutation.isPending,
  }
}
