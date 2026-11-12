import { getSupabaseConfig } from '@/config/env'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { readJson, writeJson } from '@/lib/localStorage'
import { createId } from '@/utils/id'

const TOKEN_PREFIX = 'miscuentas:mp_token:'
const INBOX_PREFIX = 'miscuentas:mp_inbox:'
const DONE_PREFIX = 'miscuentas:mp_done:'

export interface MpNotice {
  id: string
  externalId: string
  title: string
  body: string
  categoryHint?: string
  postedAt: string
  origin: 'local' | 'remote'
}

function tokenKey(userId: string): string {
  return `${TOKEN_PREFIX}${userId}`
}

function inboxKey(userId: string): string {
  return `${INBOX_PREFIX}${userId}`
}

function doneKey(userId: string): string {
  return `${DONE_PREFIX}${userId}`
}

function randomToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function supabaseInboxConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig()
  return Boolean(url && anonKey)
}

/** True si esta sesión ya guardó su Access Token. No devuelve el token. */
export async function hasMercadoPagoAccessToken(): Promise<boolean> {
  if (!supabaseInboxConfigured()) return false
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('has_mp_access_token')
  if (error) return false
  return data === true
}

/** Guarda el Access Token de la sesión actual. Otro usuario no puede leerlo ni usarlo. */
export async function saveMercadoPagoAccessToken(accessToken: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('save_mp_access_token', {
    p_token: accessToken.trim(),
  })
  if (error) throw error
}

export async function clearMercadoPagoAccessToken(): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('clear_mp_access_token')
  if (error) throw error
}

export function getMercadoPagoToken(userId: string): string | null {
  const stored = localStorage.getItem(tokenKey(userId))
  return stored && /^[a-f0-9]{64}$/.test(stored) ? stored : null
}

export async function ensureMercadoPagoToken(userId: string): Promise<string> {
  const existing = getMercadoPagoToken(userId)
  const token = existing ?? randomToken()
  if (!existing) localStorage.setItem(tokenKey(userId), token)
  if (supabaseInboxConfigured()) {
    const supabase = getSupabaseClient()
    const { error } = await supabase.rpc('register_mp_token', { p_token: token })
    if (error) throw error
  }
  return token
}

function readLocal(userId: string): MpNotice[] {
  return readJson<MpNotice[]>(inboxKey(userId), [])
}

function writeLocal(userId: string, notices: MpNotice[]): void {
  writeJson(inboxKey(userId), notices)
}

export function enqueueLocalMercadoPagoNotice(
  userId: string,
  input: {
    title: string
    body: string
    categoryHint?: string
    postedAt?: string
    externalId?: string
  },
): MpNotice | null {
  if (input.externalId && wasMercadoPagoApplied(userId, input.externalId)) return null
  const existing = readLocal(userId).find((notice) => notice.externalId === input.externalId)
  if (input.externalId && existing) {
    if (input.categoryHint && existing.categoryHint !== input.categoryHint) {
      writeLocal(
        userId,
        readLocal(userId).map((notice) =>
          notice.externalId === input.externalId
            ? { ...notice, categoryHint: input.categoryHint }
            : notice,
        ),
      )
    }
    return null
  }
  const notice: MpNotice = {
    id: createId(),
    externalId: input.externalId ?? createId(),
    title: input.title,
    body: input.body,
    ...(input.categoryHint ? { categoryHint: input.categoryHint } : {}),
    postedAt: input.postedAt ?? new Date().toISOString(),
    origin: 'local',
  }
  writeLocal(userId, [...readLocal(userId), notice])
  return notice
}

const claimInFlight = new Set<string>()
const claimStoredRemotely = new Set<string>()

function claimKey(userId: string, externalId: string): string {
  return `${userId}:${externalId}`
}

function missingRegisteredTable(error: { code?: string; message?: string }): boolean {
  const code = error.code ?? ''
  const message = error.message ?? ''
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    /mp_registered/.test(message) && /schema cache|does not exist|Could not find/i.test(message)
  )
}

/**
 * Reserva el pago antes de crear el gasto. Si otra ventana ya lo reservó,
 * no hay que insertarlo de nuevo.
 */
export async function claimMercadoPagoRegistration(
  userId: string,
  externalId: string,
): Promise<'claimed' | 'taken'> {
  const run = async (): Promise<'claimed' | 'taken'> => {
    const key = claimKey(userId, externalId)
    if (claimInFlight.has(key) || wasMercadoPagoApplied(userId, externalId)) return 'taken'
    claimInFlight.add(key)
    rememberMercadoPagoApplied(userId, externalId)
    try {
      const remote = await claimRegisteredPayment(userId, externalId)
      if (remote === 'taken') return 'taken'
      if (remote === 'stored') claimStoredRemotely.add(key)
      return 'claimed'
    } catch (error) {
      claimInFlight.delete(key)
      forgetMercadoPagoApplied(userId, externalId)
      throw error
    }
  }

  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(`miscuentas-mp:${userId}:${externalId}`, run)
  }
  return run()
}

export async function releaseMercadoPagoRegistration(
  userId: string,
  externalId: string,
): Promise<void> {
  const key = claimKey(userId, externalId)
  claimInFlight.delete(key)
  forgetMercadoPagoApplied(userId, externalId)
  if (!claimStoredRemotely.has(key) || !supabaseInboxConfigured()) return
  claimStoredRemotely.delete(key)
  const supabase = getSupabaseClient()
  await supabase
    .from('mp_registered')
    .delete()
    .eq('user_id', userId)
    .eq('external_id', externalId)
}

async function claimRegisteredPayment(
  userId: string,
  externalId: string,
): Promise<'stored' | 'taken' | 'unavailable'> {
  if (!supabaseInboxConfigured()) return 'unavailable'
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('mp_registered').insert({
    user_id: userId,
    external_id: externalId,
  })
  if (!error) return 'stored'
  if (error.code === '23505') return 'taken'
  if (missingRegisteredTable(error)) return 'unavailable'
  throw error
}

/** Pagos que la persona ya registró o ignoró. No se vuelven a mostrar. */
export function wasMercadoPagoApplied(userId: string, externalId: string): boolean {
  return readJson<string[]>(doneKey(userId), []).includes(externalId)
}

export function rememberMercadoPagoApplied(userId: string, externalId: string): void {
  const current = readJson<string[]>(doneKey(userId), [])
  if (current.includes(externalId)) return
  writeJson(doneKey(userId), [...current, externalId])
}

export function forgetMercadoPagoApplied(userId: string, externalId: string): void {
  writeJson(
    doneKey(userId),
    readJson<string[]>(doneKey(userId), []).filter((id) => id !== externalId),
  )
}

interface SyncNotice {
  externalId: string
  title: string
  body: string
  categoryHint?: string
  postedAt: string
}

/** Trae los cobros de Mercado Pago y los deja en la bandeja. */
export async function pullMercadoPagoTestNotices(userId: string): Promise<void> {
  try {
    const notices = import.meta.env.DEV
      ? await noticesFromDevServer()
      : await noticesFromProduction()
    for (const notice of notices) {
      enqueueLocalMercadoPagoNotice(userId, notice)
    }
  } catch {
    // Sin el servidor no hay cobros para leer.
  }
}

async function noticesFromDevServer(): Promise<SyncNotice[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}api/mp-test-sync`)
  if (!response.ok) return []
  const payload = (await response.json()) as { notices?: SyncNotice[] }
  return payload.notices ?? []
}

async function noticesFromProduction(): Promise<SyncNotice[]> {
  if (!supabaseInboxConfigured()) return []
  const supabase = getSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) return []
  const { data, error } = await supabase.functions.invoke('mp-sync', { method: 'GET' })
  if (error || !data || typeof data !== 'object') return []
  const notices = (data as { notices?: SyncNotice[] }).notices
  return notices ?? []
}

export async function listMercadoPagoNotices(userId: string): Promise<MpNotice[]> {
  const local = readLocal(userId).filter((notice) => notice.origin === 'local')
  const token = getMercadoPagoToken(userId)
  if (!token || !supabaseInboxConfigured()) return local

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('list_mp_inbox', { p_token: token })
  if (error || !Array.isArray(data)) return local

  const remote: MpNotice[] = data.map((row: {
    id: string
    external_id: string
    title: string
    body: string
    posted_at: string
  }) => ({
    id: row.id,
    externalId: row.external_id,
    title: row.title ?? '',
    body: row.body ?? '',
    postedAt: row.posted_at,
    origin: 'remote' as const,
  }))

  return [...remote, ...local]
}

export async function ackMercadoPagoNotice(
  userId: string,
  notice: Pick<MpNotice, 'id' | 'origin'>,
): Promise<void> {
  if (notice.origin === 'local') {
    writeLocal(
      userId,
      readLocal(userId).filter((item) => item.id !== notice.id),
    )
    return
  }
  const token = getMercadoPagoToken(userId)
  if (!token || !supabaseInboxConfigured()) return
  const supabase = getSupabaseClient()
  await supabase.rpc('ack_mp_inbox', {
    p_token: token,
    p_id: notice.id,
    p_status: 'applied',
  })
}

export async function dismissMercadoPagoNotice(
  userId: string,
  notice: Pick<MpNotice, 'id' | 'origin'>,
): Promise<void> {
  if (notice.origin === 'local') {
    writeLocal(
      userId,
      readLocal(userId).filter((item) => item.id !== notice.id),
    )
    return
  }
  const token = getMercadoPagoToken(userId)
  if (!token || !supabaseInboxConfigured()) return
  const supabase = getSupabaseClient()
  await supabase.rpc('ack_mp_inbox', {
    p_token: token,
    p_id: notice.id,
    p_status: 'dismissed',
  })
}
