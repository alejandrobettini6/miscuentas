import {
  createDefaultSettings,
  mergeSettingsUpdate,
  normalizeSettings,
} from '@/services/SettingsDefaults'
import { STORAGE_KEYS } from '@/constants/storage'
import { readJson, writeJson } from '@/lib/localStorage'
import type { Settings, UpdateSettingsInput } from '@/types/models'
import type { SettingsRepository } from '../interfaces'

function settingsKey(userId: string): string {
  return `${STORAGE_KEYS.SETTINGS}:${userId}`
}

export class LocalSettingsRepository implements SettingsRepository {
  async get(userId: string): Promise<Settings> {
    const existing = readJson<Partial<Settings> | null>(settingsKey(userId), null)
    if (existing) {
      const normalized = normalizeSettings(existing, userId)
      writeJson(settingsKey(userId), normalized)
      return normalized
    }

    const defaults = createDefaultSettings(userId)
    writeJson(settingsKey(userId), defaults)
    return defaults
  }

  async update(userId: string, input: UpdateSettingsInput): Promise<Settings> {
    const current = await this.get(userId)
    const next = mergeSettingsUpdate(current, input)
    writeJson(settingsKey(userId), next)
    return next
  }
}
