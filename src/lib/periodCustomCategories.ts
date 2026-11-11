import { STORAGE_KEYS } from '@/constants/storage'
import { readJson, writeJson } from '@/lib/localStorage'

export function readPeriodCustomCategories(): Record<string, string[]> {
  const raw = readJson<unknown>(STORAGE_KEYS.PERIOD_CUSTOM_CATEGORIES, {})
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) continue
    out[key] = value
  }
  return out
}

export function writePeriodCustomCategories(value: Record<string, string[]>): void {
  writeJson(STORAGE_KEYS.PERIOD_CUSTOM_CATEGORIES, value)
}
