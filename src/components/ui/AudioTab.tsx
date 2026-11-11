interface AudioTabProps {
  disabled?: boolean
  onClick: () => void
}

export function AudioTab({ disabled, onClick }: AudioTabProps) {
  return (
    <div className="mt-2 rounded-2xl bg-[var(--fill)] p-1" role="tablist" aria-label="Audio">
      <button
        type="button"
        role="tab"
        aria-label="Audio"
        disabled={disabled}
        className="flex min-h-10 w-full items-center justify-center rounded-xl text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--text)] disabled:opacity-50"
        onClick={onClick}
      >
        Audio
      </button>
    </div>
  )
}
