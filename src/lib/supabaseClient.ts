import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/env'

let client: SupabaseClient | null = null

/** Cliente listo para cuando VITE_DATA_MODE=supabase y el schema esté aplicado. */
export function getSupabaseClient(): SupabaseClient {
  if (client) return client

  const { url, anonKey } = getSupabaseConfig()
  if (!url || !anonKey) {
    throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY')
  }

  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return client
}
