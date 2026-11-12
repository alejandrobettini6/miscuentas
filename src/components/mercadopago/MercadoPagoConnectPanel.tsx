import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  clearMercadoPagoAccessToken,
  hasMercadoPagoAccessToken,
  saveMercadoPagoAccessToken,
  supabaseInboxConfigured,
} from '@/services/mercadopago/inbox'
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
  const [accessToken, setAccessToken] = useState('')
  const [linked, setLinked] = useState(false)
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkMessage, setLinkMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setAccessToken('')
    setLinkMessage(null)
    if (!supabaseInboxConfigured()) return
    void hasMercadoPagoAccessToken().then(setLinked)
  }, [open, userId])

  const linkAccessToken = async () => {
    setLinkBusy(true)
    setLinkMessage(null)
    try {
      await saveMercadoPagoAccessToken(accessToken)
      setAccessToken('')
      setLinked(true)
      setLinkMessage('Quedó vinculado a esta cuenta.')
    } catch (caught) {
      setLinkMessage(getErrorMessage(caught, 'No se pudo vincular el Access Token'))
    } finally {
      setLinkBusy(false)
    }
  }

  const unlinkAccessToken = async () => {
    setLinkBusy(true)
    setLinkMessage(null)
    try {
      await clearMercadoPagoAccessToken()
      setLinked(false)
      setLinkMessage('Se desvinculó Mercado Pago de esta cuenta.')
    } catch (caught) {
      setLinkMessage(getErrorMessage(caught, 'No se pudo desvincular'))
    } finally {
      setLinkBusy(false)
    }
  }

  return (
    <Modal open={open} title="Mercado Pago" onClose={onClose}>
      <div className="space-y-3 text-sm text-[var(--text)]">
        {supabaseInboxConfigured() ? (
          <>
            {linked ? <p>Esta cuenta ya tiene Mercado Pago vinculado.</p> : null}
            <input
              type="password"
              value={accessToken}
              onChange={(event) => setAccessToken(event.target.value)}
              autoComplete="off"
              aria-label="Access Token de Mercado Pago"
              placeholder="APP_USR-…"
              className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => void linkAccessToken()}
                disabled={linkBusy || accessToken.trim().length < 40}
              >
                {linkBusy ? 'Guardando…' : 'Vincular a esta cuenta'}
              </Button>
              {linked ? (
                <Button
                  variant="secondary"
                  onClick={() => void unlinkAccessToken()}
                  disabled={linkBusy}
                >
                  Desvincular
                </Button>
              ) : null}
            </div>
            {linkMessage && <p>{linkMessage}</p>}
          </>
        ) : (
          <p className="text-[var(--muted)]">Falta configurar Supabase.</p>
        )}
      </div>
    </Modal>
  )
}
