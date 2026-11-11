import { describe, expect, it } from 'vitest'
import { mergeVoiceTranscripts } from './mergeVoiceTranscripts'

describe('mergeVoiceTranscripts', () => {
  it('recupera cinco dólares de Whisper y conserva gym de Chrome', () => {
    expect(mergeVoiceTranscripts('agrega gym 5', 'agrega jim cinco dolares')).toBe(
      'agrega gym cinco dolares',
    )
  })

  it('agrega pesos si Chrome no los escribió', () => {
    expect(
      mergeVoiceTranscripts('agrega super carrefour 80000', 'agrega super cafe 80000 pesos'),
    ).toBe('agrega super carrefour 80000 pesos')
  })

  it('si solo hay Whisper, usa Whisper', () => {
    expect(mergeVoiceTranscripts('', 'agrega gym cinco pesos')).toBe(
      'agrega gym cinco pesos',
    )
  })
})
