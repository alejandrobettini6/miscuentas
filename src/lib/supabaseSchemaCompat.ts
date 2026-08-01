/** PostgREST error when a column exists in code but not yet in the remote DB. */
export function isMissingColumnError(error: unknown, column: string): boolean {
  if (!error || typeof error !== 'object') return false
  const message = String((error as { message?: string }).message ?? '')
  return message.includes(`'${column}'`) && message.includes('schema cache')
}
