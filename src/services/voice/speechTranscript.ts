const CURRENCY_WORD =
  /\b(pesos|peso|dolares|dolar|dollars|dollar|usd)\b|u\$s|\bus\$/gi
const DOLLAR_SIGN = /\$|\bus\$\b|\bu\$s\b/i

type SpeechAlt = { transcript?: string }

type SpeechResultLike = ArrayLike<SpeechAlt> & { length: number }

type SpeechEventLike = {
  results: ArrayLike<SpeechResultLike> & { length: number }
}

export function hasCurrencyWord(text: string): boolean {
  CURRENCY_WORD.lastIndex = 0
  return CURRENCY_WORD.test(text)
}

function currencyWordsIn(text: string): string[] {
  CURRENCY_WORD.lastIndex = 0
  return [...text.matchAll(CURRENCY_WORD)].map((match) => match[0])
}

/** Google no deja desactivar el ITN: “pesos/dólares” → `$`. A veces queda en interinos o alternativas. */
export function currencyWordsFromSpeechEvent(event: SpeechEventLike): string[] {
  const words: string[] = []
  for (let i = 0; i < event.results.length; i++) {
    const result = event.results[i]
    if (!result) continue
    for (let j = 0; j < result.length; j++) {
      for (const word of currencyWordsIn(result[j]?.transcript ?? '')) {
        words.push(word)
      }
    }
  }
  return words
}

export function mergeCurrencyHints(existing: string[], incoming: string[]): string[] {
  const next = [...existing]
  for (const word of incoming) {
    const lower = word.toLowerCase()
    const index = next.findIndex((item) => item.toLowerCase() === lower)
    if (index >= 0) next.splice(index, 1)
    next.push(word)
  }
  return next
}

export function applySpokenCurrencyHint(text: string, hints: string[]): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (!trimmed) return ''
  if (hasCurrencyWord(trimmed)) return trimmed
  const hint = hints.at(-1)
  if (!hint) return trimmed
  const withoutSigns = trimmed
    .replace(/\b(u\$s|us\$)\b/gi, ' ')
    .replace(/\$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return `${withoutSigns} ${hint.toLowerCase()}`.trim()
}

/** Chrome reescribió moneda a `$` y no hay palabra recuperada. */
export function needsCurrencyFallback(text: string): boolean {
  if (hasCurrencyWord(text)) return false
  return DOLLAR_SIGN.test(text)
}

function pickResultTranscript(result: SpeechResultLike): string {
  const primary = result[0]?.transcript ?? ''
  if (hasCurrencyWord(primary) || result.length < 2) return primary

  const extras: string[] = []
  for (let i = 1; i < result.length; i++) {
    const alt = result[i]?.transcript ?? ''
    for (const word of currencyWordsIn(alt)) {
      if (!extras.some((item) => item.toLowerCase() === word.toLowerCase())) {
        extras.push(word)
      }
    }
  }
  if (extras.length === 0) return primary
  return `${primary} ${extras.join(' ')}`.replace(/\s+/g, ' ').trim()
}

export function joinTranscriptChunks(base: string, session: string): string {
  const previous = base.trim()
  const next = session.trim()
  if (!next) return previous
  if (!previous) return next
  if (next.startsWith(previous)) return next
  if (previous.includes(next)) return previous
  return `${previous} ${next}`
}

/** Junta el resultado principal con “pesos/dólares” si Google los dejó en una alternativa. */
export function transcriptFromSpeechEvent(event: SpeechEventLike): string {
  return Array.from({ length: event.results.length }, (_, i) => {
    const result = event.results[i]
    return result ? pickResultTranscript(result) : ''
  })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}
