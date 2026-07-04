import { Menu } from 'lucide-react'
import { getCurrentMonthLabel } from '@/utils/date'

interface HeaderProps {
  onOpenMenu: () => void
}

export function Header({ onOpenMenu }: HeaderProps) {
  return (
    <header className="flex items-center justify-between py-3">
      <button
        type="button"
        className="flex min-h-11 min-w-11 items-center justify-center rounded-xl"
        aria-label="Abrir menú"
        onClick={onOpenMenu}
      >
        <Menu size={26} />
      </button>
      <h1 className="text-lg font-semibold">{getCurrentMonthLabel()}</h1>
      <div className="min-w-11" aria-hidden="true" />
    </header>
  )
}
