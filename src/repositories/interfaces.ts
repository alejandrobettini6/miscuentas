import type {
  CreateExpenseInput,
  Expense,
  ImportAccountsPayload,
  Period,
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

export interface PeriodRepository {
  list(userId: string): Promise<Period[]>
  getActive(userId: string): Promise<Period | null>
  ensureActive(userId: string, monthlyLimit: number): Promise<Period>
  /** Cierra el activo y abre el siguiente. */
  closeAndOpenNext(userId: string, monthlyLimit: number): Promise<Period>
  /** En modo automático: cierra el activo si el mes calendario cambió. */
  rolloverIfNeeded(userId: string, monthlyLimit: number): Promise<Period>
  replaceAll(userId: string, periods: Period[]): Promise<void>
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
  /** @deprecated Usar PeriodRepository.closeAndOpenNext */
  resetMonth(userId: string): Promise<void>
  replaceAll(userId: string, expenses: Expense[]): Promise<void>
}

export interface ImportRepository {
  replaceAll(userId: string, payload: NormalizedImportPayload): Promise<void>
}

export interface NormalizedImportPayload {
  settings: Settings
  periods: Period[]
  expenses: Expense[]
  source: ImportAccountsPayload
}
