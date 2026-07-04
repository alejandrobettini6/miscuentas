export const queryKeys = {
  expenses: (userId: string) => ['expenses', userId] as const,
  settings: (userId: string) => ['settings', userId] as const,
}
