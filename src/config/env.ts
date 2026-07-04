export type DataMode = 'local' | 'supabase'

export function getDataMode(): DataMode {
  const mode = import.meta.env.VITE_DATA_MODE
  return mode === 'supabase' ? 'supabase' : 'local'
}

export function getSupabaseConfig() {
  return {
    url: import.meta.env.VITE_SUPABASE_URL ?? '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  }
}
