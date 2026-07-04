import { useEffect, useState } from 'react'
import { UNDO_WINDOW_MS } from '@/constants/categories'

interface UndoBarProps {
  deadline: number | null
  onUndo: () => void
  onExpire: () => void
}

/** Usa deadline absoluto para sobrevivir background de Chrome. */
export function UndoBar({ deadline, onUndo, onExpire }: UndoBarProps) {
  const [remainingMs, setRemainingMs] = useState(0)

  useEffect(() => {
    if (!deadline) {
      setRemainingMs(0)
      return
    }

    const tick = () => {
      const left = deadline - Date.now()
      if (left <= 0) {
        setRemainingMs(0)
        onExpire()
        return
      }
      setRemainingMs(left)
    }

    tick()
    const interval = window.setInterval(tick, 200)
    const onVisibility = () => tick()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [deadline, onExpire])

  if (!deadline || remainingMs <= 0) return null

  const seconds = Math.ceil(remainingMs / 1000)

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center p-4">
      <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-2xl bg-[#1d1d1f] px-4 py-3 text-white shadow-lg">
        <span className="text-sm">
          Movimiento registrado · {seconds}s
        </span>
        <button
          type="button"
          className="min-h-11 min-w-11 font-semibold text-[var(--green)]"
          aria-label="Deshacer último movimiento"
          onClick={onUndo}
        >
          Deshacer
        </button>
      </div>
    </div>
  )
}

export function createUndoDeadline(): number {
  return Date.now() + UNDO_WINDOW_MS
}
