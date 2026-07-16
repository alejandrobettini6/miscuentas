export const queryKeys = {
  expenses: (userId: string) => ['expenses', userId] as const,
  settings: (userId: string) => ['settings', userId] as const,
  periods: (
    userId: string,
    monthMode?: string | number | null,
    monthlyLimit?: string | number | null,
  ) => ['periods', userId, monthMode ?? null, monthlyLimit ?? null] as const,
}
