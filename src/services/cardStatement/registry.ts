import { mercadopagoParser } from './parsers/mercadopago'
import type {
  CardStatementParser,
  DetectResult,
  ParseOptions,
  ParsedMovement,
} from './types'
import { DETECT_CONFIDENCE_THRESHOLD } from './types'

export const CARD_STATEMENT_PARSERS: CardStatementParser[] = [
  mercadopagoParser,
]

export function getParserById(id: string): CardStatementParser | undefined {
  return CARD_STATEMENT_PARSERS.find((p) => p.id === id)
}

export function detectBestParser(text: string): DetectResult | null {
  let best: DetectResult | null = null
  for (const parser of CARD_STATEMENT_PARSERS) {
    const confidence = parser.detect(text)
    if (!best || confidence > best.confidence) {
      best = { parser, confidence }
    }
  }
  return best
}

export function shouldAskBankSelection(result: DetectResult | null): boolean {
  return !result || result.confidence < DETECT_CONFIDENCE_THRESHOLD
}

export function parseWithBank(
  text: string,
  parserId: string,
  options?: ParseOptions,
): ParsedMovement[] {
  const parser = getParserById(parserId)
  if (!parser) throw new Error(`Banco no soportado: ${parserId}`)
  return parser.parse(text, options)
}

export { DETECT_CONFIDENCE_THRESHOLD }
