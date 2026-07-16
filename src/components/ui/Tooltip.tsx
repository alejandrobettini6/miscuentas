import type { ReactNode } from 'react'

interface TooltipProps {
  text: string
  children: ReactNode
}

/** Tooltip accesible por title + texto colapsable en touch. */
export function Tooltip({ text, children }: TooltipProps) {
  return (
    <span className="group relative inline-flex items-center gap-1">
      {children}
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#e5e5ea] text-[11px] font-bold text-[var(--muted)]"
        title={text}
        aria-label={text}
      >
        ?
      </span>
    </span>
  )
}
