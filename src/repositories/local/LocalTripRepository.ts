import { STORAGE_KEYS } from '@/constants/storage'
import { TRIP_REOPEN_DAYS } from '@/constants/tripCategories'
import { readJson, writeJson } from '@/lib/localStorage'
import { TripExpenseService } from '@/services/TripExpenseService'
import { TripStatus } from '@/types/enums'
import type {
  CreateTripExpenseInput,
  CreateTripInput,
  Settings,
  Trip,
  TripExpense,
  UpdateTripExpenseInput,
  UpdateTripInput,
} from '@/types/models'
import { createId } from '@/utils/id'
import type { TripRepository } from '../interfaces'

function tripsKey(userId: string): string {
  return `${STORAGE_KEYS.TRIPS}:${userId}`
}

function tripExpensesKey(userId: string, tripId: string): string {
  return `${STORAGE_KEYS.TRIP_EXPENSES}:${userId}:${tripId}`
}

export class LocalTripRepository implements TripRepository {
  async listTrips(userId: string): Promise<Trip[]> {
    return readJson<Trip[]>(tripsKey(userId), [])
  }

  async createTrip(userId: string, input: CreateTripInput): Promise<Trip> {
    const now = new Date().toISOString()
    const trip: Trip = {
      id: createId(),
      userId,
      name: input.name || 'Viaje',
      status: TripStatus.ACTIVE,
      budgetMode: input.budgetMode,
      budgetLimit: input.budgetLimit ?? null,
      countsAgainstMonthly: input.countsAgainstMonthly ?? false,
      enabledAccounts: input.enabledAccounts,
      enabledCurrencies: input.enabledCurrencies,
      enabledCategories: input.enabledCategories,
      customCategories: [],
      createdAt: now,
      closedAt: null,
      mergedAt: null,
      mergeMode: null,
      mergedExpenseIds: null,
      reopenDeadline: null,
    }
    const all = await this.listTrips(userId)
    all.push(trip)
    writeJson(tripsKey(userId), all)
    return trip
  }

  async updateTrip(userId: string, tripId: string, input: UpdateTripInput): Promise<Trip> {
    const all = await this.listTrips(userId)
    const index = all.findIndex((t) => t.id === tripId)
    if (index < 0) throw new Error('Viaje no encontrado')

    const current = all[index]!
    const updated: Trip = {
      ...current,
      name: input.name ?? current.name,
      budgetMode: input.budgetMode ?? current.budgetMode,
      budgetLimit: input.budgetLimit !== undefined ? input.budgetLimit : current.budgetLimit,
      countsAgainstMonthly: input.countsAgainstMonthly ?? current.countsAgainstMonthly,
      enabledAccounts: input.enabledAccounts ?? current.enabledAccounts,
      enabledCurrencies: input.enabledCurrencies ?? current.enabledCurrencies,
      enabledCategories: input.enabledCategories ?? current.enabledCategories,
      customCategories: input.customCategories ?? current.customCategories,
    }
    all[index] = updated
    writeJson(tripsKey(userId), all)
    return updated
  }

  async closeTrip(userId: string, tripId: string): Promise<Trip> {
    const all = await this.listTrips(userId)
    const index = all.findIndex((t) => t.id === tripId)
    if (index < 0) throw new Error('Viaje no encontrado')

    const now = new Date()
    const reopenDeadline = new Date(now.getTime() + TRIP_REOPEN_DAYS * 24 * 60 * 60 * 1000)
    const updated: Trip = {
      ...all[index]!,
      status: TripStatus.CLOSED,
      closedAt: now.toISOString(),
      reopenDeadline: reopenDeadline.toISOString(),
    }
    all[index] = updated
    writeJson(tripsKey(userId), all)
    return updated
  }

  async reopenTrip(userId: string, tripId: string): Promise<Trip> {
    const all = await this.listTrips(userId)
    const index = all.findIndex((t) => t.id === tripId)
    if (index < 0) throw new Error('Viaje no encontrado')

    const updated: Trip = {
      ...all[index]!,
      status: TripStatus.ACTIVE,
      closedAt: null,
      mergedAt: null,
      mergeMode: null,
      mergedExpenseIds: null,
      reopenDeadline: null,
    }
    all[index] = updated
    writeJson(tripsKey(userId), all)
    return updated
  }

  async deleteTrip(userId: string, tripId: string): Promise<void> {
    const all = await this.listTrips(userId)
    writeJson(
      tripsKey(userId),
      all.filter((t) => t.id !== tripId),
    )
    writeJson(tripExpensesKey(userId, tripId), [])
  }

  async listExpenses(userId: string, tripId: string): Promise<TripExpense[]> {
    return readJson<TripExpense[]>(tripExpensesKey(userId, tripId), [])
  }

  async createExpense(
    userId: string,
    input: CreateTripExpenseInput,
    trip: Trip,
    settings: Settings,
  ): Promise<TripExpense> {
    const expense = TripExpenseService.buildExpense(userId, input, trip, settings)
    const all = await this.listExpenses(userId, trip.id)
    all.push(expense)
    writeJson(tripExpensesKey(userId, trip.id), all)
    return expense
  }

  async updateExpense(
    userId: string,
    expenseId: string,
    input: UpdateTripExpenseInput,
    trip: Trip,
    settings: Settings,
  ): Promise<TripExpense> {
    const all = await this.listExpenses(userId, trip.id)
    const index = all.findIndex((e) => e.id === expenseId)
    if (index < 0) throw new Error('Gasto de viaje no encontrado')

    const updated = TripExpenseService.updateExpense(all[index]!, input, trip, settings)
    all[index] = updated
    writeJson(tripExpensesKey(userId, trip.id), all)
    return updated
  }

  async removeExpense(userId: string, expenseId: string): Promise<void> {
    const trips = await this.listTrips(userId)
    for (const trip of trips) {
      const all = await this.listExpenses(userId, trip.id)
      const filtered = all.filter((e) => e.id !== expenseId)
      if (filtered.length !== all.length) {
        writeJson(tripExpensesKey(userId, trip.id), filtered)
        return
      }
    }
  }

  async setMergeData(
    userId: string,
    tripId: string,
    mergeMode: string,
    mergedExpenseIds: string[],
  ): Promise<void> {
    const all = await this.listTrips(userId)
    const index = all.findIndex((t) => t.id === tripId)
    if (index < 0) return

    all[index] = {
      ...all[index]!,
      mergedAt: new Date().toISOString(),
      mergeMode: mergeMode as Trip['mergeMode'],
      mergedExpenseIds,
    }
    writeJson(tripsKey(userId), all)
  }

  async clearMergeData(userId: string, tripId: string): Promise<void> {
    const all = await this.listTrips(userId)
    const index = all.findIndex((t) => t.id === tripId)
    if (index < 0) return

    all[index] = {
      ...all[index]!,
      mergedAt: null,
      mergeMode: null,
      mergedExpenseIds: null,
    }
    writeJson(tripsKey(userId), all)
  }
}
