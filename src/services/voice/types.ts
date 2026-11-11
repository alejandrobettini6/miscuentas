import type { AccountType, Category, Currency } from '@/types/enums'

export interface VoiceExpenseDraft {
  accountType: AccountType
  category: Category
  description: string | null
  originalAmount: number
  originalCurrency: Currency
  /** Categoría OTHER creada solo para el período actual. */
  monthOnlyCategory: boolean
  /** Etiqueta para el preview (Gym, Super, Ojotas, Otros). */
  label: string
}

export interface VoiceInterpretContext {
  enabledAccounts: AccountType[]
  enabledCurrencies: Currency[]
  enabledFixedCategories: Category[]
  customCategories: string[]
  monthOnlyCategories: string[]
  /** Pestaña Blanco/Negro; null si Totales o no hay cuenta activa. */
  activeAccountType: AccountType | null
}

export type VoiceInterpretResult =
  | { status: 'ok'; draft: VoiceExpenseDraft; transcript: string }
  | { status: 'error'; message: string; transcript: string }
  | { status: 'needs_ai'; transcript: string }

export interface VoiceInterpreter {
  interpret(
    transcript: string,
    context: VoiceInterpretContext,
  ): VoiceInterpretResult | Promise<VoiceInterpretResult>
}
