import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { getAuthRedirectUrl } from './authRedirect'

describe('getAuthRedirectUrl', () => {
  beforeEach(() => {
    vi.stubEnv('BASE_URL', '/miscuentas/')
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('combina origin y base path', () => {
    expect(getAuthRedirectUrl()).toBe('http://localhost:3000/miscuentas/')
  })
})
