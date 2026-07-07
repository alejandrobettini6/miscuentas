/** URL de retorno para OAuth y reset password (local + GitHub Pages). */
export function getAuthRedirectUrl(): string {
  const base = import.meta.env.BASE_URL ?? '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  return `${window.location.origin}${normalizedBase}`
}
