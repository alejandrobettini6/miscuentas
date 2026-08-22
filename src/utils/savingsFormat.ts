import { Currency } from '@/types/enums'

export function savingsCurrencySubtitle(currency: Currency): string {
  return currency === Currency.ARS
    ? 'Montos en pesos (ARS)'
    : 'Montos en dólares (USD)'
}

export function savingsCurrencyCode(currency: Currency): string {
  return currency === Currency.ARS ? 'ARS' : 'USD'
}
