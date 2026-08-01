import { STORAGE_KEYS } from '@/constants/storage'
import { readJson, writeJson } from '@/lib/localStorage'
import { IncomeService } from '@/services/IncomeService'
import type {
  CreateIncomeInput,
  Income,
  Settings,
  UpdateIncomeInput,
} from '@/types/models'
import type { IncomeRepository } from '../interfaces'

function incomesKey(userId: string): string {
  return `${STORAGE_KEYS.INCOMES}:${userId}`
}

export class LocalIncomeRepository implements IncomeRepository {
  async list(userId: string): Promise<Income[]> {
    return readJson<Income[]>(incomesKey(userId), [])
  }

  async create(
    userId: string,
    input: CreateIncomeInput,
    settings: Settings,
  ): Promise<Income> {
    const income = IncomeService.buildIncome(userId, input, settings)
    const all = await this.list(userId)
    all.push(income)
    writeJson(incomesKey(userId), all)
    return income
  }

  async update(
    userId: string,
    incomeId: string,
    input: UpdateIncomeInput,
    settings: Settings,
  ): Promise<Income> {
    const all = await this.list(userId)
    const index = all.findIndex((income) => income.id === incomeId)
    if (index < 0) throw new Error('Ingreso no encontrado')

    const current = all[index]
    if (!current) throw new Error('Ingreso no encontrado')

    const updated = IncomeService.updateIncome(current, input, settings)
    all[index] = updated
    writeJson(incomesKey(userId), all)
    return updated
  }

  async remove(userId: string, incomeId: string): Promise<void> {
    const all = await this.list(userId)
    writeJson(
      incomesKey(userId),
      all.filter((income) => income.id !== incomeId),
    )
  }

  async replaceAll(userId: string, incomes: Income[]): Promise<void> {
    writeJson(
      incomesKey(userId),
      incomes.map((income) => ({ ...income, userId })),
    )
  }
}
