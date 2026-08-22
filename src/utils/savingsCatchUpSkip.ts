const STORAGE_PREFIX = 'miscuentas_skipped_savings_catchup'

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`
}

function readSkipped(userId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

export function isSavingsCatchUpSkipped(userId: string, periodId: string): boolean {
  return readSkipped(userId).includes(periodId)
}

export function markSavingsCatchUpSkipped(userId: string, periodId: string): void {
  const next = new Set(readSkipped(userId))
  next.add(periodId)
  localStorage.setItem(storageKey(userId), JSON.stringify([...next]))
}
