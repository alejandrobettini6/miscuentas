import { STORAGE_KEYS } from '@/constants/storage'
import { readJson, removeKey, writeJson } from '@/lib/localStorage'
import type { AuthEvent } from '../interfaces'
import type { User } from '@/types/models'
import { createId } from '@/utils/id'
import type { AuthRepository } from '../interfaces'

const listeners = new Set<(user: User | null, event?: AuthEvent) => void>()

function notify(user: User | null, event?: AuthEvent): void {
  listeners.forEach((listener) => listener(user, event))
}

const LOCAL_ONLY = 'Disponible solo con Supabase (VITE_DATA_MODE=supabase)'

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
    notify(user, 'SIGNED_IN')
    return user
  }

  async loginWithGoogle(): Promise<void> {
    throw new Error(LOCAL_ONLY)
  }

  async resetPassword(_email: string): Promise<void> {
    throw new Error(LOCAL_ONLY)
  }

  async updatePassword(_password: string): Promise<void> {
    throw new Error(LOCAL_ONLY)
  }

  async logout(): Promise<void> {
    removeKey(STORAGE_KEYS.SESSION)
    notify(null, 'SIGNED_OUT')
  }

  onAuthStateChange(
    callback: (user: User | null, event?: AuthEvent) => void,
  ): () => void {
    listeners.add(callback)
    return () => {
      listeners.delete(callback)
    }
  }
}
