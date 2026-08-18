export const TRIP_FIXED_CATEGORIES = [
  'VUELO',
  'HOTEL',
  'COMIDA',
  'TRANSPORTE',
  'SALIDAS',
  'EXCURSIONES',
  'SOUVENIRS',
  'SEGUROS',
  'FARMACIA',
] as const

export type TripCategoryId = (typeof TRIP_FIXED_CATEGORIES)[number]

export const TRIP_CATEGORY_LABELS: Record<TripCategoryId, string> = {
  VUELO: 'Vuelo / Micro',
  HOTEL: 'Hoteles',
  COMIDA: 'Comida',
  TRANSPORTE: 'Transporte',
  SALIDAS: 'Salidas',
  EXCURSIONES: 'Excursiones',
  SOUVENIRS: 'Souvenirs / Regalos',
  SEGUROS: 'Seguros de viaje',
  FARMACIA: 'Farmacia / Salud',
}

export const TRIP_OTHER_CATEGORY = 'OTHER'

export function getTripCategoryLabel(category: string): string {
  if (category in TRIP_CATEGORY_LABELS) {
    return TRIP_CATEGORY_LABELS[category as TripCategoryId]
  }
  if (category === TRIP_OTHER_CATEGORY) return 'Otros'
  return category
}

export const MAX_OPEN_TRIPS = 3
export const TRIP_REOPEN_DAYS = 30

/** Fusión individual al cerrar viaje (cada gasto a su categoría mensual). */
export const TRIP_INDIVIDUAL_MERGE_ENABLED = false
