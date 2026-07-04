import { getSupabaseClient } from '@/lib/supabaseClient'
import type { User } from '@/types/models'
import type { AuthRepository } from '../interfaces'

function mapUser(id: string, email: string | undefined): User {
  return { id, email: email ?? '' }
}

/** Implementación real — activar con VITE_DATA_MODE=supabase */
export class SupabaseAuthRepository implements AuthRepository {
  async getSession(): Promise<User | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    const session = data.session
    if (!session?.user) return null
    return mapUser(session.user.id, session.user.email)
  }

  async login(email: string, password: string): Promise<User> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('No se pudo iniciar sesión')
    return mapUser(data.user.id, data.user.email)
  }

  async logout(): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    const supabase = getSupabaseClient()
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        callback(null)
        return
      }
      callback(mapUser(session.user.id, session.user.email))
    })
    return () => data.subscription.unsubscribe()
  }
}
