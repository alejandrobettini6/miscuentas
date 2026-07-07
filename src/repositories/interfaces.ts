import type {
  CreateExpenseInput,
  Expense,
  Settings,
  UpdateExpenseInput,
  UpdateSettingsInput,
  User,
} from '@/types/models'

export type AuthEvent =
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'PASSWORD_RECOVERY'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'

export interface AuthRepository {
  getSession(): Promise<User | null>
  login(email: string, password: string): Promise<User>
  loginWithGoogle(): Promise<void>
  resetPassword(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
  logout(): Promise<void>
  onAuthStateChange(
    callback: (user: User | null, event?: AuthEvent) => void,
  ): () => void
}

export interface SettingsRepository {
  get(userId: string): Promise<Settings>
  update(userId: string, input: UpdateSettingsInput): Promise<Settings>
}

export interface ExpenseRepository {
  list(userId: string): Promise<Expense[]>
  create(userId: string, input: CreateExpenseInput, settings: Settings): Promise<Expense>
  update(
    userId: string,
    expenseId: string,
    input: UpdateExpenseInput,
    settings: Settings,
  ): Promise<Expense>
  remove(userId: string, expenseId: string): Promise<void>
  resetMonth(userId: string): Promise<void>
}
