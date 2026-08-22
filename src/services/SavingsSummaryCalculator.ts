import type { SavingsLocationRow, Settings } from '@/types/models'

export class SavingsSummaryCalculator {
  static calculate(settings: Settings): {
    totalSaved: number
    byLocation: SavingsLocationRow[]
  } {
    const balances = settings.savingsBalances
    const locations = settings.savingsLocations

    const byLocation: SavingsLocationRow[] = locations.map((name) => ({
      name,
      amount: round(balances[name] ?? 0),
    }))

    const withBalance = byLocation
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount)
    const empty = byLocation
      .filter((row) => row.amount === 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))

    const totalSaved = round(
      byLocation.reduce((acc, row) => acc + row.amount, 0),
    )

    return {
      totalSaved,
      byLocation: [...withBalance, ...empty],
    }
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
