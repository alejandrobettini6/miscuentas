import { normalizeSearchText } from '@/services/ExpenseSearchService'
import { Currency } from '@/types/enums'

/** Solo palabras explícitas. El signo $ en es-AR casi siempre es pesos. */
const USD_RE = /\b(dolares|dolar|dollars|dollar|usd)\b|u\$s|\bus\$/
const ARS_RE = /\b(pesos|peso|ars)\b/

/** Detecta moneda en cualquier posición del texto (también pegada al número). */
export function detectSpokenCurrency(text: string): Currency | null {
  const normalized = normalizeSearchText(text)
    .replace(/(\d)([a-z])/gi, '$1 $2')
    .replace(/([a-z])(\d)/gi, '$1 $2')

  const usdMatches = [...normalized.matchAll(new RegExp(USD_RE, 'g'))]
  const arsMatches = [...normalized.matchAll(new RegExp(ARS_RE, 'g'))]
  const lastUsd = usdMatches.at(-1)?.index ?? -1
  const lastArs = arsMatches.at(-1)?.index ?? -1

  if (lastUsd >= 0 && lastArs >= 0) {
    return lastUsd > lastArs ? Currency.USD : Currency.ARS
  }
  if (lastUsd >= 0) return Currency.USD
  if (lastArs >= 0) return Currency.ARS
  return null
}
