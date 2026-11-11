import { describe, expect, it } from 'vitest'
import {
  applySpokenCurrencyHint,
  currencyWordsFromSpeechEvent,
  joinTranscriptChunks,
  mergeCurrencyHints,
  needsCurrencyFallback,
  transcriptFromSpeechEvent,
} from './speechTranscript'

describe('transcriptFromSpeechEvent', () => {
  it('usa el resultado principal si ya trae la moneda', () => {
    const text = transcriptFromSpeechEvent({
      results: [
        {
          length: 2,
          0: { transcript: 'agrega gym 80 mil pesos' },
          1: { transcript: 'agrega gym 80000' },
        },
      ],
    })
    expect(text).toBe('agrega gym 80 mil pesos')
  })

  it('rescata pesos o dólares de una alternativa', () => {
    const text = transcriptFromSpeechEvent({
      results: [
        {
          length: 3,
          0: { transcript: 'agrega gym 80000' },
          1: { transcript: 'agrega gym $ 80000' },
          2: { transcript: 'agrega gym 80 mil dolares' },
        },
      ],
    })
    expect(text.toLowerCase()).toContain('dolares')
    expect(text).toContain('80000')
  })
})

describe('currency hints from Chrome ITN', () => {
  it('guarda dólares de un resultado interino aunque el final sea $', () => {
    const words = currencyWordsFromSpeechEvent({
      results: [
        {
          length: 1,
          0: { transcript: 'agrega gym cinco dolares' },
        },
      ],
    })
    expect(words.map((word) => word.toLowerCase())).toContain('dolares')
    expect(
      applySpokenCurrencyHint('agrega gym $5', mergeCurrencyHints([], words)),
    ).toBe('agrega gym 5 dolares')
  })

  it('no pide Whisper si ya recuperó la moneda', () => {
    expect(needsCurrencyFallback('agrega gym 5 dolares')).toBe(false)
    expect(needsCurrencyFallback('agrega gym $5')).toBe(true)
  })
})

describe('joinTranscriptChunks', () => {
  it('acumula una segunda toma en vez de pisar la primera', () => {
    expect(joinTranscriptChunks('agrega gym 80000', 'pesos en negro')).toBe(
      'agrega gym 80000 pesos en negro',
    )
  })
})
