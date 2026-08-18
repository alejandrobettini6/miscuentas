import { getSupabaseClient } from '@/lib/supabaseClient'
import { TripExpenseService } from '@/services/TripExpenseService'
import { TripStatus, SummaryDisplayMode, TripMergeMode } from '@/types/enums'
import type { AccountType, Currency } from '@/types/enums'
import type {
  CreateTripExpenseInput,
  CreateTripInput,
  Settings,
  Trip,
  TripExpense,
  UpdateTripExpenseInput,
  UpdateTripInput,
} from '@/types/models'
import type { TripRepository } from '../interfaces'
import { TRIP_REOPEN_DAYS } from '@/constants/tripCategories'
import { createId } from '@/utils/id'

interface TripRow {
  id: string
  user_id: string
  name: string
  status: string
  budget_mode: string
  budget_limit: number | null
  counts_against_monthly: boolean
  enabled_accounts: string[]
  enabled_currencies: string[]
  enabled_categories: string[]
  custom_categories: string[]
  created_at: string
  closed_at: string | null
  merged_at: string | null
  merge_mode: string | null
  merged_expense_ids: string[] | null
  reopen_deadline: string | null
}

interface TripExpenseRow {
  id: string
  user_id: string
  trip_id: string
  account_type: string
  category: string
  description: string | null
  original_currency: string
  original_amount: number
  exchange_rate: number
  usd_amount: number
  created_at: string
  updated_at: string
}

function mapTrip(row: TripRow): Trip {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    status: row.status as TripStatus,
    budgetMode: row.budget_mode as SummaryDisplayMode,
    budgetLimit: row.budget_limit !== null ? Number(row.budget_limit) : null,
    countsAgainstMonthly: row.counts_against_monthly,
    enabledAccounts: (row.enabled_accounts ?? []) as AccountType[],
    enabledCurrencies: (row.enabled_currencies ?? []) as Currency[],
    enabledCategories: row.enabled_categories ?? [],
    customCategories: row.custom_categories ?? [],
    createdAt: row.created_at,
    closedAt: row.closed_at,
    mergedAt: row.merged_at,
    mergeMode: row.merge_mode as TripMergeMode | null,
    mergedExpenseIds: row.merged_expense_ids,
    reopenDeadline: row.reopen_deadline,
  }
}

function mapExpense(row: TripExpenseRow): TripExpense {
  return {
    id: row.id,
    userId: row.user_id,
    tripId: row.trip_id,
    accountType: row.account_type as AccountType,
    category: row.category,
    description: row.description,
    originalCurrency: row.original_currency as Currency,
    originalAmount: Number(row.original_amount),
    exchangeRate: Number(row.exchange_rate),
    usdAmount: Number(row.usd_amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SupabaseTripRepository implements TripRepository {
  async listTrips(userId: string): Promise<Trip[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data as TripRow[]).map(mapTrip)
  }

  async createTrip(userId: string, input: CreateTripInput): Promise<Trip> {
    const supabase = getSupabaseClient()
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('trips')
      .insert({
        id: createId(),
        user_id: userId,
        name: input.name || 'Viaje',
        status: TripStatus.ACTIVE,
        budget_mode: input.budgetMode,
        budget_limit: input.budgetLimit ?? null,
        counts_against_monthly: input.countsAgainstMonthly ?? false,
        enabled_accounts: input.enabledAccounts,
        enabled_currencies: input.enabledCurrencies,
        enabled_categories: input.enabledCategories,
        custom_categories: [],
        created_at: now,
      })
      .select('*')
      .single()

    if (error) throw error
    return mapTrip(data as TripRow)
  }

  async updateTrip(userId: string, tripId: string, input: UpdateTripInput): Promise<Trip> {
    const supabase = getSupabaseClient()
    const updates: Record<string, unknown> = {}

    if (input.name !== undefined) updates.name = input.name
    if (input.budgetMode !== undefined) updates.budget_mode = input.budgetMode
    if (input.budgetLimit !== undefined) updates.budget_limit = input.budgetLimit
    if (input.countsAgainstMonthly !== undefined) updates.counts_against_monthly = input.countsAgainstMonthly
    if (input.enabledAccounts !== undefined) updates.enabled_accounts = input.enabledAccounts
    if (input.enabledCurrencies !== undefined) updates.enabled_currencies = input.enabledCurrencies
    if (input.enabledCategories !== undefined) updates.enabled_categories = input.enabledCategories
    if (input.customCategories !== undefined) updates.custom_categories = input.customCategories

    const { data, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', tripId)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) throw error
    return mapTrip(data as TripRow)
  }

  async closeTrip(userId: string, tripId: string): Promise<Trip> {
    const supabase = getSupabaseClient()
    const now = new Date()
    const reopenDeadline = new Date(now.getTime() + TRIP_REOPEN_DAYS * 24 * 60 * 60 * 1000)

    const { data, error } = await supabase
      .from('trips')
      .update({
        status: TripStatus.CLOSED,
        closed_at: now.toISOString(),
        reopen_deadline: reopenDeadline.toISOString(),
      })
      .eq('id', tripId)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) throw error
    return mapTrip(data as TripRow)
  }

  async reopenTrip(userId: string, tripId: string): Promise<Trip> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('trips')
      .update({
        status: TripStatus.ACTIVE,
        closed_at: null,
        merged_at: null,
        merge_mode: null,
        merged_expense_ids: null,
        reopen_deadline: null,
      })
      .eq('id', tripId)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) throw error
    return mapTrip(data as TripRow)
  }

  async deleteTrip(userId: string, tripId: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error: expError } = await supabase
      .from('trip_expenses')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', userId)

    if (expError) throw expError

    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId)
      .eq('user_id', userId)

    if (error) throw error
  }

  async listExpenses(userId: string, tripId: string): Promise<TripExpense[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('trip_expenses')
      .select('*')
      .eq('user_id', userId)
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data as TripExpenseRow[]).map(mapExpense)
  }

  async createExpense(
    userId: string,
    input: CreateTripExpenseInput,
    trip: Trip,
    settings: Settings,
  ): Promise<TripExpense> {
    const supabase = getSupabaseClient()
    const expense = TripExpenseService.buildExpense(userId, input, trip, settings)
    const { data, error } = await supabase
      .from('trip_expenses')
      .insert({
        id: expense.id,
        user_id: expense.userId,
        trip_id: expense.tripId,
        account_type: expense.accountType,
        category: expense.category,
        description: expense.description,
        original_currency: expense.originalCurrency,
        original_amount: expense.originalAmount,
        exchange_rate: expense.exchangeRate,
        usd_amount: expense.usdAmount,
        created_at: expense.createdAt,
        updated_at: expense.updatedAt,
      })
      .select('*')
      .single()

    if (error) throw error
    return mapExpense(data as TripExpenseRow)
  }

  async updateExpense(
    userId: string,
    expenseId: string,
    input: UpdateTripExpenseInput,
    trip: Trip,
    settings: Settings,
  ): Promise<TripExpense> {
    const all = await this.listExpenses(userId, trip.id)
    const current = all.find((e) => e.id === expenseId)
    if (!current) throw new Error('Gasto de viaje no encontrado')

    const updated = TripExpenseService.updateExpense(current, input, trip, settings)
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('trip_expenses')
      .update({
        original_currency: updated.originalCurrency,
        original_amount: updated.originalAmount,
        exchange_rate: updated.exchangeRate,
        usd_amount: updated.usdAmount,
        updated_at: updated.updatedAt,
      })
      .eq('id', expenseId)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) throw error
    return mapExpense(data as TripExpenseRow)
  }

  async removeExpense(userId: string, expenseId: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('trip_expenses')
      .delete()
      .eq('id', expenseId)
      .eq('user_id', userId)

    if (error) throw error
  }

  async setMergeData(
    userId: string,
    tripId: string,
    mergeMode: string,
    mergedExpenseIds: string[],
  ): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('trips')
      .update({
        merged_at: new Date().toISOString(),
        merge_mode: mergeMode,
        merged_expense_ids: mergedExpenseIds,
      })
      .eq('id', tripId)
      .eq('user_id', userId)

    if (error) throw error
  }

  async clearMergeData(userId: string, tripId: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('trips')
      .update({
        merged_at: null,
        merge_mode: null,
        merged_expense_ids: null,
      })
      .eq('id', tripId)
      .eq('user_id', userId)

    if (error) throw error
  }
}
