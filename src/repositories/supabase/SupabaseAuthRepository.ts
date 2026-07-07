import { getSupabaseClient } from '@/lib/supabaseClient'
import type { AuthEvent } from '../interfaces'
import type { User } from '@/types/models'
import { getAuthRedirectUrl } from '@/utils/authRedirect'
import type { AuthRepository } from '../interfaces'

function mapUser(id: string, email: string | undefined): User {
  return { id, email: email ?? '' }
}

function mapAuthEvent(event: string): AuthEvent | undefined {
  const allowed: AuthEvent[] = [
    'SIGNED_IN',
    'SIGNED_OUT',
    'PASSWORD_RECOVERY',
    'TOKEN_REFRESHED',
    'USER_UPDATED',
  ]
  return allowed.includes(event as AuthEvent) ? (event as AuthEvent) : undefined
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

  async loginWithGoogle(): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getAuthRedirectUrl() },
    })
    if (error) throw new Error(error.message)
  }

  async resetPassword(email: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getAuthRedirectUrl(),
    })
    if (error) throw new Error(error.message)
  }

  async updatePassword(password: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw new Error(error.message)
  }

  async logout(): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  onAuthStateChange(
    callback: (user: User | null, event?: AuthEvent) => void,
  ): () => void {
    const supabase = getSupabaseClient()
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        callback(null, mapAuthEvent(event))
        return
      }
      callback(mapUser(session.user.id, session.user.email), mapAuthEvent(event))
    })
    return () => data.subscription.unsubscribe()
  }
}
