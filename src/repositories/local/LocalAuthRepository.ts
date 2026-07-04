import { STORAGE_KEYS } from '@/constants/storage'
import { readJson, removeKey, writeJson } from '@/lib/localStorage'
import type { User } from '@/types/models'
import { createId } from '@/utils/id'
import type { AuthRepository } from '../interfaces'

const listeners = new Set<(user: User | null) => void>()

function notify(user: User | null): void {
  listeners.forEach((listener) => listener(user))
}

/**
 * Auth local para validar la app sin Supabase.
 * Acepta cualquier email/password no vacíos y persiste la sesión.
 */
export class LocalAuthRepository implements AuthRepository {
  async getSession(): Promise<User | null> {
    return readJson<User | null>(STORAGE_KEYS.SESSION, null)
  }

  async login(email: string, password: string): Promise<User> {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !password) {
      throw new Error('Completá email y contraseña')
    }

    const existing = readJson<User | null>(STORAGE_KEYS.SESSION, null)
    const user: User =
      existing?.email === trimmed
        ? existing
        : { id: createId(), email: trimmed }

    writeJson(STORAGE_KEYS.SESSION, user)
    notify(user)
    return user
  }

  async logout(): Promise<void> {
    removeKey(STORAGE_KEYS.SESSION)
    notify(null)
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    listeners.add(callback)
    return () => {
      listeners.delete(callback)
    }
  }
}
