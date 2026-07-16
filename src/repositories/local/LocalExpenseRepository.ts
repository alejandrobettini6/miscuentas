import { STORAGE_KEYS } from '@/constants/storage'
import { readJson, writeJson } from '@/lib/localStorage'
import { ExpenseService } from '@/services/ExpenseService'
import type {
  CreateExpenseInput,
  Expense,
  Settings,
  UpdateExpenseInput,
} from '@/types/models'
import type { ExpenseRepository } from '../interfaces'

function expensesKey(userId: string): string {
  return `${STORAGE_KEYS.EXPENSES}:${userId}`
}

export class LocalExpenseRepository implements ExpenseRepository {
  async list(userId: string): Promise<Expense[]> {
    return readJson<Expense[]>(expensesKey(userId), [])
  }

  async create(
    userId: string,
    input: CreateExpenseInput,
    settings: Settings,
  ): Promise<Expense> {
    const expense = ExpenseService.buildExpense(userId, input, settings)
    const all = await this.list(userId)
    all.push(expense)
    writeJson(expensesKey(userId), all)
    return expense
  }

  async update(
    userId: string,
    expenseId: string,
    input: UpdateExpenseInput,
    settings: Settings,
  ): Promise<Expense> {
    const all = await this.list(userId)
    const index = all.findIndex((e) => e.id === expenseId)
    if (index < 0) throw new Error('Movimiento no encontrado')

    const current = all[index]
    if (!current) throw new Error('Movimiento no encontrado')

    const updated = ExpenseService.updateExpense(current, input, settings)
    all[index] = updated
    writeJson(expensesKey(userId), all)
    return updated
  }

  async remove(userId: string, expenseId: string): Promise<void> {
    const all = await this.list(userId)
    writeJson(
      expensesKey(userId),
      all.filter((e) => e.id !== expenseId),
    )
  }

  async resetMonth(_userId: string): Promise<void> {
    void _userId
  }

  async replaceAll(userId: string, expenses: Expense[]): Promise<void> {
    writeJson(
      expensesKey(userId),
      expenses.map((e) => ({ ...e, userId })),
    )
  }
}
