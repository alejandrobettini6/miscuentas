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
  input: { title: string; body: string; postedAt?: string; externalId?: string },
): MpNotice | null {
  if (input.externalId && wasMercadoPagoApplied(userId, input.externalId)) return null
  const existing = readLocal(userId).find((notice) => notice.externalId === input.externalId)
  if (input.externalId && existing) return null
  const notice: MpNotice = {
    id: createId(),
    externalId: input.externalId ?? createId(),
    title: input.title,
    body: input.body,
    postedAt: input.postedAt ?? new Date().toISOString(),
    origin: 'local',
  }
  writeLocal(userId, [...readLocal(userId), notice])
  return notice
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

/** Trae los pagos de prueba del servidor local y los deja en la bandeja. */
export async function pullMercadoPagoTestNotices(userId: string): Promise<void> {
  if (!import.meta.env.DEV) return
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}api/mp-test-sync`)
    if (!response.ok) return
    const payload = (await response.json()) as {
      notices?: Array<{
        externalId: string
        title: string
        body: string
        postedAt: string
      }>
    }
    for (const notice of payload.notices ?? []) {
      enqueueLocalMercadoPagoNotice(userId, {
        externalId: notice.externalId,
        title: notice.title,
        body: notice.body,
        postedAt: notice.postedAt,
      })
    }
  } catch {
    // Sin el servidor de desarrollo no hay pagos de prueba para leer.
  }
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
