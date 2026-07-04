import { describe, expect, it } from 'vitest'
import { createId, isValidUuid } from './id'

describe('createId', () => {
  it('genera UUID v4 válido', () => {
    for (let i = 0; i < 20; i++) {
      const id = createId()
      expect(isValidUuid(id)).toBe(true)
    }
  })

  it('usa fallback si randomUUID lanza (contexto no seguro)', () => {
    const original = crypto.randomUUID
    crypto.randomUUID = () => {
      throw new DOMException('insecure', 'SecurityError')
    }

    try {
      const id = createId()
      expect(isValidUuid(id)).toBe(true)
    } finally {
      crypto.randomUUID = original
    }
  })
})
