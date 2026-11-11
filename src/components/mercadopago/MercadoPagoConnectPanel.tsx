import { useEffect, useState } from 'react'
import { getSupabaseConfig } from '@/config/env'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  enqueueLocalMercadoPagoNotice,
  ensureMercadoPagoToken,
  getMercadoPagoToken,
  supabaseInboxConfigured,
} from '@/services/mercadopago/inbox'
import type { TestPaymentNotice } from '@/services/mercadopago/fromPayment'
import { getErrorMessage } from '@/utils/errors'

interface MercadoPagoConnectPanelProps {
  open: boolean
  userId: string
  onClose: () => void
}

export function MercadoPagoConnectPanel({
  open,
  userId,
  onClose,
}: MercadoPagoConnectPanelProps) {
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [testBusy, setTestBusy] = useState(false)
  const config = getSupabaseConfig()

  useEffect(() => {
    if (!open) return
    setToken(getMercadoPagoToken(userId))
    setError(null)
  }, [open, userId])

  const searchTestPayments = async () => {
    setTestBusy(true)
    setTestMessage(null)
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/mp-test-sync`)
      const payload = (await response.json()) as {
        error?: string
        notices?: TestPaymentNotice[]
      }
      if (!response.ok) {
        setTestMessage(payload.error ?? 'No se pudieron leer los pagos de prueba')
        return
      }
      const notices = payload.notices ?? []
      let added = 0
      for (const notice of notices) {
        const saved = enqueueLocalMercadoPagoNotice(userId, notice)
        if (saved) added += 1
      }
      setTestMessage(
        added > 0
          ? `Llegaron ${added} pagos de prueba. Cerrá este menú para registrarlos.`
          : 'La cuenta de prueba no tiene pagos aprobados nuevos.',
      )
    } catch (caught) {
      setTestMessage(getErrorMessage(caught, 'No se pudieron leer los pagos de prueba'))
    } finally {
      setTestBusy(false)
    }
  }

  const activate = async () => {
    setBusy(true)
    setError(null)
    try {
      setToken(await ensureMercadoPagoToken(userId))
    } catch (caught) {
      setError(
        getErrorMessage(
          caught,
          'No se pudo registrar el token. Aplicá la migración de Mercado Pago en Supabase.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="Mercado Pago" onClose={onClose}>
      <div className="space-y-3 text-sm text-[var(--text)]">
        <p>
          Una app en el teléfono lee el aviso de Mercado Pago en el momento del
          pago y lo deja acá. Al abrir Mis Cuentas, un QR con categoría clara
          se guarda en Blanco. Una transferencia, o un pago sin categoría,
          pregunta en un modal.
        </p>
        {supabaseInboxConfigured() ? (
          <>
            <p className="text-[var(--muted)]">
              En la app del teléfono pegá estos tres datos.
            </p>
            <CopyRow label="URL" value={config.url} />
            <CopyRow label="Clave anónima" value={config.anonKey} />
            {token ? (
              <CopyRow label="Token" value={token} />
            ) : (
              <Button onClick={() => void activate()} disabled={busy}>
                {busy ? 'Activando…' : 'Activar avisos'}
              </Button>
            )}
            {error && (
              <p className="text-[var(--red)]" role="alert">
                {error}
              </p>
            )}
          </>
        ) : (
          <p className="text-[var(--muted)]">
            Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. Sin
            eso el teléfono no tiene dónde dejar el aviso.
          </p>
        )}
        {import.meta.env.DEV && (
          <div className="space-y-2 rounded-xl bg-[var(--fill)] p-3">
            <p className="font-medium">Cuenta de prueba</p>
            <p className="text-[var(--muted)]">
              Con la app abierta en este servidor, los pagos de prueba entran
              solos. La contraseña del usuario de prueba no se usa. El Access
              Token va en .env.local como MP_ACCESS_TOKEN.
            </p>
            <Button
              variant="secondary"
              onClick={() => void searchTestPayments()}
              disabled={testBusy}
            >
              {testBusy ? 'Buscando…' : 'Buscar pagos de prueba'}
            </Button>
            {testMessage && <p>{testMessage}</p>}
          </div>
        )}
        <p className="text-[var(--muted)]">
          Un pago en un comercio conocido (super, farmacia, nafta, delivery,
          servicios) se guarda solo. Una transferencia, o un comercio que no
          reconocemos, abre un modal para elegir la categoría.
        </p>
      </div>
    </Modal>
  )
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-[var(--muted)]">{label}</div>
      <button
        type="button"
        className="w-full break-all rounded-xl border border-[var(--border)] px-3 py-2 text-left text-xs"
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1500)
          })
        }}
      >
        {copied ? 'Copiado' : value}
      </button>
    </div>
  )
}
