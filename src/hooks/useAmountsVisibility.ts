import { useCallback, useState } from 'react'
import { STORAGE_KEYS } from '@/constants/storage'
import { readJson, writeJson } from '@/lib/localStorage'

/**
 * Preferencia local (por dispositivo) para ocultar los totales grandes
 * de la tarjeta resumen. No viaja a Settings/backend: es solo de UI.
 */
export function useAmountsVisibility(): [boolean, () => void] {
  const [hidden, setHidden] = useState<boolean>(() =>
    readJson<boolean>(STORAGE_KEYS.AMOUNTS_HIDDEN, false),
  )

  const toggle = useCallback(() => {
    setHidden((prev) => {
      const next = !prev
      writeJson(STORAGE_KEYS.AMOUNTS_HIDDEN, next)
      return next
    })
  }, [])

  return [hidden, toggle]
}
