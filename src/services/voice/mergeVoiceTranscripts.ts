import { tokenizeVoiceText, isNumberishToken } from './parseSpokenAmount'

const CURRENCY_TOKENS = new Set([
  'peso',
  'pesos',
  'dolar',
  'dolares',
  'dollar',
  'dollars',
  'usd',
])

function isCurrencyToken(token: string): boolean {
  return CURRENCY_TOKENS.has(token)
}

function isSpelledNumberToken(token: string): boolean {
  return isNumberishToken(token) && !/^\d/.test(token) && token !== '$'
}

function stripTrailingAmount(tokens: string[]): string[] {
  let end = tokens.length
  while (end > 0 && isCurrencyToken(tokens[end - 1]!)) end -= 1
  while (end > 0 && (isNumberishToken(tokens[end - 1]!) || tokens[end - 1] === '$')) {
    end -= 1
  }
  return tokens.slice(0, end)
}

function trailingAmountPhrase(tokens: string[]): string[] {
  let end = tokens.length
  let start = end
  if (start > 0 && isCurrencyToken(tokens[start - 1]!)) start -= 1
  while (start > 0 && isNumberishToken(tokens[start - 1]!)) start -= 1
  return tokens.slice(start, end)
}

function sanitizeChrome(text: string): string {
  return text.replace(/\$/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Chrome: rápido, buenos nombres de categoría, pero come "pesos/dólares".
 * Whisper: más literal con moneda y números hablados, a veces cambia palabras.
 * Nos quedamos con Chrome y le pegamos de Whisper la moneda y el monto en palabras.
 */
export function mergeVoiceTranscripts(chrome: string, whisper: string): string {
  const fast = sanitizeChrome(chrome)
  const slow = whisper.trim()
  if (!fast) return slow
  if (!slow) return fast

  const fastTokens = tokenizeVoiceText(fast)
  const slowTokens = tokenizeVoiceText(slow)
  const slowAmount = trailingAmountPhrase(slowTokens)
  const slowCurrency = slowAmount.find(isCurrencyToken) ?? slowTokens.find(isCurrencyToken)
  const slowSpelled = slowAmount.some(isSpelledNumberToken)
  const fastHasCurrency = fastTokens.some(isCurrencyToken)
  const fastHasDigits = fastTokens.some((token) => /^\d/.test(token))

  if (slowSpelled && slowAmount.length > 0 && fastHasDigits) {
    return [...stripTrailingAmount(fastTokens), ...slowAmount].join(' ')
  }

  if (slowCurrency && !fastHasCurrency) {
    return [...fastTokens, slowCurrency].join(' ')
  }

  return fastTokens.join(' ') || fast
}
