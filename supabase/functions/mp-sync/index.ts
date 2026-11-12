import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { fetchMercadoPagoNotices } from '../../../src/services/mercadopago/fetchNotices.ts'

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'GET, OPTIONS',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }
  if (request.method !== 'GET') {
    return json(405, { error: 'Método no permitido.' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const authorization = request.headers.get('Authorization') ?? ''
  if (!supabaseUrl || !anonKey || !authorization) {
    return json(401, { error: 'Tenés que estar logueado.' })
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return json(401, { error: 'Tenés que estar logueado.' })
  }

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!serviceKey) {
    return json(503, { error: 'El servidor no puede leer las credenciales.' })
  }
  const admin = createClient(supabaseUrl, serviceKey)
  const { data: credential, error: credentialError } = await admin
    .from('mp_credentials')
    .select('access_token')
    .eq('user_id', data.user.id)
    .maybeSingle()
  if (credentialError) {
    return json(503, { error: 'No se pudo leer la credencial de este usuario.' })
  }
  const token = credential?.access_token?.trim()
  if (!token) {
    return json(404, { error: 'Esta cuenta no tiene Mercado Pago vinculado.' })
  }

  try {
    const notices = await fetchMercadoPagoNotices(token)
    return json(200, { notices })
  } catch {
    return json(502, { error: 'No se pudo consultar Mercado Pago.' })
  }
})

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  })
}
