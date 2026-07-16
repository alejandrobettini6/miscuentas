import { Category } from '@/types/enums'
import type { Expense, Settings } from '@/types/models'

/**
 * Proyecta movimientos visibles según configuración del usuario.
 * No muta ni elimina datos: solo determina qué entra en dashboard/reportes.
 */
export class VisibilityProjector {
  static project(expenses: Expense[], settings: Settings): Expense[] {
    const accounts = new Set(settings.enabledAccounts)
    const currencies = new Set(settings.enabledCurrencies)
    const fixed = new Set(settings.enabledFixedCategories)

    return expenses.filter((expense) => {
      if (!accounts.has(expense.accountType)) return false
      if (!currencies.has(expense.originalCurrency)) return false
      if (
        expense.category !== Category.OTHER &&
        !fixed.has(expense.category)
      ) {
        return false
      }
      return true
    })
  }

  static forPeriod(expenses: Expense[], periodId: string | null | undefined): Expense[] {
    if (!periodId) return []
    return expenses.filter((expense) => expense.periodId === periodId)
  }

  static projectPeriod(
    expenses: Expense[],
    settings: Settings,
    periodId: string | null | undefined,
  ): Expense[] {
    return this.project(this.forPeriod(expenses, periodId), settings)
  }
}
