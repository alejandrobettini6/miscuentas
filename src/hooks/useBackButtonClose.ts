import { useEffect, useRef } from 'react'

type CloseHandler = () => void

/**
 * Stack global (a nivel de módulo, no de instancia) de los modales
 * actualmente abiertos, en orden de apertura. Es compartido por todas las
 * instancias del hook a propósito: el historial del navegador es un único
 * stack global, así que la coordinación entre modales tiene que serlo
 * también.
 */
const openHandlers: CloseHandler[] = []
let listenerAttached = false

function handleGlobalPopState() {
  const handler = openHandlers.pop()
  handler?.()
}

function ensureGlobalListener() {
  if (listenerAttached) return
  listenerAttached = true
  window.addEventListener('popstate', handleGlobalPopState)
}

/**
 * Hace que el botón/gesto "atrás" del celular cierre el modal/overlay en vez
 * de salir de la app o navegar a la página anterior del navegador.
 *
 * Diseño: mientras `open` es true, se pushea una entrada de historial
 * "dummy" y se registra un handler de cierre en un stack GLOBAL compartido
 * (no por instancia). Un único listener de `popstate` (registrado una sola
 * vez para toda la app) desapila y ejecuta el handler correspondiente
 * cuando el usuario presiona atrás de verdad.
 *
 * A propósito, al cerrar el modal por cualquier otra vía (botón Cancelar,
 * tocar el overlay, cambiar a otro modal, etc.) NO llamamos a
 * `history.back()`: solo sacamos el handler del stack. Eso deja una entrada
 * "fantasma" en el historial real, pero es un costo aceptable a cambio de
 * eliminar por completo las condiciones de carrera:
 *
 * - React StrictMode (desarrollo) ejecuta cada efecto en un ciclo
 *   setup → cleanup → setup apenas el componente monta. Si llamáramos a
 *   `history.back()` en ese cleanup sintético, su `popstate` (asíncrono)
 *   podía llegar después del segundo setup y cerrar el modal recién abierto.
 * - Cuando un modal se cierra y otro se abre en el mismo tick (ej. cerrar
 *   "ver detalle" para abrir "editar"), un `history.back()` diferido del
 *   primero podía terminar consumiendo la entrada recién pusheada por el
 *   segundo, y disparar el cierre del modal equivocado.
 *
 * Al no tocar nunca el historial real salvo para pushear, ninguno de los
 * dos escenarios puede ocurrir: el único disparador de `onRequestClose` por
 * el gesto de atrás es un `popstate` genuino del usuario, que siempre
 * corresponde al tope real del stack de historial (y por lo tanto, al
 * último modal pusheado que sigue registrado).
 *
 * No hace nada si `onRequestClose` no está definido (modal sin forma de
 * cerrarse, ej. onboarding obligatorio).
 */
export function useBackButtonClose(
  open: boolean,
  onRequestClose?: () => void,
): void {
  const onRequestCloseRef = useRef(onRequestClose)
  onRequestCloseRef.current = onRequestClose
  const handlerRef = useRef<CloseHandler | null>(null)

  useEffect(() => {
    if (!open || !onRequestCloseRef.current) return

    ensureGlobalListener()

    const handler: CloseHandler = () => onRequestCloseRef.current?.()
    handlerRef.current = handler
    openHandlers.push(handler)
    window.history.pushState({ miscuentasModal: true }, '')

    return () => {
      const idx = openHandlers.lastIndexOf(handler)
      if (idx !== -1) openHandlers.splice(idx, 1)
      handlerRef.current = null
    }
  }, [open])
}
