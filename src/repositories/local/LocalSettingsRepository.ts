import { DEFAULT_SETTINGS } from '@/constants/categories'
import { STORAGE_KEYS } from '@/constants/storage'
import { readJson, writeJson } from '@/lib/localStorage'
import type { Settings, UpdateSettingsInput } from '@/types/models'
import type { SettingsRepository } from '../interfaces'

function settingsKey(userId: string): string {
  return `${STORAGE_KEYS.SETTINGS}:${userId}`
}

function normalizeSettings(raw: Settings, userId: string): Settings {
  return {
    userId: raw.userId ?? userId,
    usdWhite: raw.usdWhite,
    usdCash: raw.usdCash,
    monthlyLimit: raw.monthlyLimit,
    customCategories: Array.isArray(raw.customCategories) ? raw.customCategories : [],
    updatedAt: raw.updatedAt,
  }
}

export class LocalSettingsRepository implements SettingsRepository {
  async get(userId: string): Promise<Settings> {
    const existing = readJson<Settings | null>(settingsKey(userId), null)
    if (existing) {
      const normalized = normalizeSettings(existing, userId)
      if (!Array.isArray(existing.customCategories)) {
        writeJson(settingsKey(userId), normalized)
      }
      return normalized
    }

    const defaults: Settings = {
      userId,
      usdWhite: DEFAULT_SETTINGS.usdWhite,
      usdCash: DEFAULT_SETTINGS.usdCash,
      monthlyLimit: DEFAULT_SETTINGS.monthlyLimit,
      customCategories: [...DEFAULT_SETTINGS.customCategories],
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
      customCategories: input.customCategories ?? current.customCategories,
      updatedAt: new Date().toISOString(),
    }
    writeJson(settingsKey(userId), next)
    return next
  }
}
