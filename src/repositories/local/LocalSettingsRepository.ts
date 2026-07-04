import { DEFAULT_SETTINGS } from '@/constants/categories'
import { STORAGE_KEYS } from '@/constants/storage'
import { readJson, writeJson } from '@/lib/localStorage'
import type { Settings, UpdateSettingsInput } from '@/types/models'
import type { SettingsRepository } from '../interfaces'

function settingsKey(userId: string): string {
  return `${STORAGE_KEYS.SETTINGS}:${userId}`
}

export class LocalSettingsRepository implements SettingsRepository {
  async get(userId: string): Promise<Settings> {
    const existing = readJson<Settings | null>(settingsKey(userId), null)
    if (existing) return existing

    const defaults: Settings = {
      userId,
      usdWhite: DEFAULT_SETTINGS.usdWhite,
      usdCash: DEFAULT_SETTINGS.usdCash,
      monthlyLimit: DEFAULT_SETTINGS.monthlyLimit,
      updatedAt: new Date().toISOString(),
    }
    writeJson(settingsKey(userId), defaults)
    return defaults
  }

  async update(userId: string, input: UpdateSettingsInput): Promise<Settings> {
    const current = await this.get(userId)
    const next: Settings = {
      ...current,
      usdWhite: input.usdWhite ?? current.usdWhite,
      usdCash: input.usdCash ?? current.usdCash,
      monthlyLimit: input.monthlyLimit ?? current.monthlyLimit,
      updatedAt: new Date().toISOString(),
    }
    writeJson(settingsKey(userId), next)
    return next
  }
}
