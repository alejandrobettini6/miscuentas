import { getSupabaseClient } from '@/lib/supabaseClient'
import { ExpenseService } from '@/services/ExpenseService'
import type { AccountType, Category, Currency } from '@/types/enums'
import type {
  CreateExpenseInput,
  Expense,
  Settings,
  UpdateExpenseInput,
} from '@/types/models'
import type { ExpenseRepository } from '../interfaces'

interface ExpenseRow {
  id: string
  user_id: string
  period_id: string
  account_type: AccountType
  category: Category
  description: string | null
  original_currency: Currency
  original_amount: number
  exchange_rate: number
  usd_amount: number
  created_at: string
  updated_at: string
}

function mapRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    userId: row.user_id,
    periodId: row.period_id,
    accountType: row.account_type,
    category: row.category,
    description: row.description,
    originalCurrency: row.original_currency,
    originalAmount: Number(row.original_amount),
    exchangeRate: Number(row.exchange_rate),
    usdAmount: Number(row.usd_amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRow(expense: Expense): ExpenseRow {
  return {
    id: expense.id,
    user_id: expense.userId,
    period_id: expense.periodId,
    account_type: expense.accountType,
    category: expense.category,
    description: expense.description,
    original_currency: expense.originalCurrency,
    original_amount: expense.originalAmount,
    exchange_rate: expense.exchangeRate,
    usd_amount: expense.usdAmount,
    created_at: expense.createdAt,
    updated_at: expense.updatedAt,
  }
}

export class SupabaseExpenseRepository implements ExpenseRepository {
  async list(userId: string): Promise<Expense[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data as ExpenseRow[]).map(mapRow)
  }

  async create(
    userId: string,
    input: CreateExpenseInput,
    settings: Settings,
  ): Promise<Expense> {
    const expense = ExpenseService.buildExpense(userId, input, settings)
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('expenses')
      .insert(toRow(expense))
      .select('*')
      .single()

    if (error) throw error
    return mapRow(data as ExpenseRow)
  }

  async update(
    userId: string,
    expenseId: string,
    input: UpdateExpenseInput,
    settings: Settings,
  ): Promise<Expense> {
    const all = await this.list(userId)
    const current = all.find((e) => e.id === expenseId)
    if (!current) throw new Error('Movimiento no encontrado')

    const updated = ExpenseService.updateExpense(current, input, settings)
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('expenses')
      .update(toRow(updated))
      .eq('id', expenseId)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) throw error
    return mapRow(data as ExpenseRow)
  }

  async remove(userId: string, expenseId: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('user_id', userId)

    if (error) throw error
  }

  async resetMonth(_userId: string): Promise<void> {
    // Conservamos el historial: el cierre se hace vía PeriodRepository.
    void _userId
  }

  async replaceAll(userId: string, expenses: Expense[]): Promise<void> {
    const supabase = getSupabaseClient()
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('user_id', userId)
    if (deleteError) throw deleteError

    if (expenses.length === 0) return

    const { error } = await supabase
      .from('expenses')
      .insert(expenses.map((e) => toRow({ ...e, userId })))
    if (error) throw error
  }
}
