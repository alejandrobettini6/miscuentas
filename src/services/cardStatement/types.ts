import type { Currency } from '@/types/enums'

export interface ParsedMovement {
  /** ISO date YYYY-MM-DD when available */
  date?: string
  description: string
  amount: number
  currency: Currency
  rawLine?: string
  /** e.g. "3/6" when the line is an installment */
  installment?: string
}

export interface ParseOptions {
  /** Calendar year hint when statement dates omit the year (e.g. Mercado Pago). */
  yearHint?: number
}

export interface CardStatementParser {
  id: string
  displayName: string
  /** Confidence 0..1 that this text belongs to this bank. */
  detect(text: string): number
  parse(text: string, options?: ParseOptions): ParsedMovement[]
}

export interface DetectResult {
  parser: CardStatementParser
  confidence: number
}

/** Minimum confidence to auto-select a bank without asking. */
export const DETECT_CONFIDENCE_THRESHOLD = 0.55
