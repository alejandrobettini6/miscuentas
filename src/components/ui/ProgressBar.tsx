import { BudgetColor } from '@/types/enums'

const COLORS: Record<BudgetColor, string> = {
  [BudgetColor.GREEN]: 'var(--green)',
  [BudgetColor.YELLOW]: 'var(--yellow)',
  [BudgetColor.ORANGE]: 'var(--orange)',
  [BudgetColor.RED]: 'var(--red)',
}

interface ProgressBarProps {
  ratio: number
  color: BudgetColor
}

export function ProgressBar({ ratio, color }: ProgressBarProps) {
  const width = `${Math.max(0, Math.min(100, ratio * 100))}%`

  return (
    <div
      className="h-3 w-full overflow-hidden rounded-full bg-[#e5e5ea]"
      role="progressbar"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width, backgroundColor: COLORS[color] }}
      />
    </div>
  )
}
