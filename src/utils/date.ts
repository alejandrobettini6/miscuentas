const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

/** Clave YYYY-MM del mes calendario. */
export function getYearMonthKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/** Etiqueta legible a partir de YYYY-MM. */
export function getMonthLabelFromKey(yearMonth: string): string {
  const [yearRaw, monthRaw] = yearMonth.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  if (!year || !month || month < 1 || month > 12) return yearMonth
  return `${MONTH_NAMES[month - 1]} ${year}`
}

/** Siguiente YYYY-MM. */
export function nextYearMonth(yearMonth: string): string {
  const [yearRaw, monthRaw] = yearMonth.split('-')
  let year = Number(yearRaw)
  let month = Number(monthRaw)
  if (!year || !month) return getYearMonthKey()
  month += 1
  if (month > 12) {
    month = 1
    year += 1
  }
  return `${year}-${String(month).padStart(2, '0')}`
}

/** Etiqueta del mes actual (calendario). */
export function getCurrentMonthLabel(date = new Date()): string {
  return getMonthLabelFromKey(getYearMonthKey(date))
}

export function formatDateParts(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const date = [
    String(d.getDate()).padStart(2, '0'),
    String(d.getMonth() + 1).padStart(2, '0'),
    d.getFullYear(),
  ].join('/')
  const time = [
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0'),
  ].join(':')
  return { date, time }
}

/** Vista de detalles: dd/mm/yy hh:mm */
export function formatDetailTimestamp(iso: string): string {
  const d = new Date(iso)
  const date = [
    String(d.getDate()).padStart(2, '0'),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getFullYear()).slice(-2),
  ].join('/')
  const time = [
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
  ].join(':')
  return `${date} ${time}`
}
