import { useCallback, useEffect, useRef, useState } from 'react'
import {
  blobToWhisperAudio,
  pickRecorderMimeType,
  rmsFromTimeDomain,
} from '@/services/voice/audioCapture'
import { createVoiceInterpreter } from '@/services/voice/createVoiceInterpreter'
import { mergeVoiceTranscripts } from '@/services/voice/mergeVoiceTranscripts'
import {
  applySpokenCurrencyHint,
  currencyWordsFromSpeechEvent,
  joinTranscriptChunks,
  mergeCurrencyHints,
  needsCurrencyFallback,
  transcriptFromSpeechEvent,
} from '@/services/voice/speechTranscript'
import { transcribeSpanishAudio } from '@/services/voice/whisperTranscribe'
import type {
  VoiceExpenseDraft,
  VoiceInterpretContext,
} from '@/services/voice/types'

const NEEDS_AI_MESSAGE =
  'No pude entender el audio. Probá de nuevo diciendo categoría, monto y moneda.'

const SPEECH_RMS = 0.045
const SILENCE_MS = 1300
const MIN_SPEECH_MS = 500
const MAX_RECORD_MS = 20_000

const interpreter = createVoiceInterpreter()

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  abort: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionEventLike = {
  results: ArrayLike<{
    isFinal: boolean
    length: number
    [index: number]: { transcript?: string }
  }>
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

export type VoiceUiPhase =
  | { phase: 'loading'; message: string }
  | { phase: 'listening'; transcript: string }
  | { phase: 'transcribing'; transcript: string }
  | { phase: 'preview'; transcript: string; draft: VoiceExpenseDraft }
  | { phase: 'error'; transcript: string; message: string }
  | { phase: 'unsupported' }

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useVoiceExpense() {
  const [open, setOpen] = useState(false)
  const [ui, setUi] = useState<VoiceUiPhase | null>(null)
  const contextRef = useRef<VoiceInterpretContext | null>(null)
  const closingRef = useRef(false)
  const finishingRef = useRef(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const vadTimerRef = useRef<number | null>(null)
  const maxTimerRef = useRef<number | null>(null)
  const hadSpeechRef = useRef(false)
  const speechStartedAtRef = useRef(0)
  const silenceSinceRef = useRef<number | null>(null)
  const chromeTranscriptRef = useRef('')
  const currencyHintRef = useRef<string[]>([])
  const sessionBaseRef = useRef('')
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const speechCtorRef = useRef<SpeechRecognitionCtor | null>(null)

  const clearTimers = useCallback(() => {
    if (vadTimerRef.current != null) {
      window.clearInterval(vadTimerRef.current)
      vadTimerRef.current = null
    }
    if (maxTimerRef.current != null) {
      window.clearTimeout(maxTimerRef.current)
      maxTimerRef.current = null
    }
  }, [])

  const stopWebSpeech = useCallback(() => {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (!recognition) return
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
    try {
      recognition.abort()
    } catch {
      /* noop */
    }
  }, [])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    analyserRef.current = null
    const context = audioContextRef.current
    audioContextRef.current = null
    if (context && context.state !== 'closed') {
      void context.close()
    }
  }, [])

  const stopRecorder = useCallback(() => {
    const recorder = recorderRef.current
    recorderRef.current = null
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch {
        /* noop */
      }
    }
  }, [])

  const close = useCallback(() => {
    closingRef.current = true
    finishingRef.current = true
    clearTimers()
    stopWebSpeech()
    stopRecorder()
    stopStream()
    setOpen(false)
    setUi(null)
    contextRef.current = null
    chunksRef.current = []
    chromeTranscriptRef.current = ''
    currencyHintRef.current = []
  }, [clearTimers, stopRecorder, stopStream, stopWebSpeech])

  const interpretTranscript = useCallback((transcript: string) => {
    const context = contextRef.current
    if (!context) return
    const trimmed = transcript.trim()
    if (!trimmed) {
      setUi({
        phase: 'error',
        transcript: trimmed,
        message: 'No se escuchó nada. Probá de nuevo.',
      })
      return
    }
    const result = interpreter.interpret(trimmed, context)
    void Promise.resolve(result).then((resolved) => {
      if (closingRef.current) return
      if (resolved.status === 'ok') {
        setUi({
          phase: 'preview',
          transcript: resolved.transcript,
          draft: resolved.draft,
        })
        return
      }
      if (resolved.status === 'needs_ai') {
        setUi({
          phase: 'error',
          transcript: resolved.transcript,
          message: NEEDS_AI_MESSAGE,
        })
        return
      }
      setUi({
        phase: 'error',
        transcript: resolved.transcript,
        message: resolved.message,
      })
    })
  }, [])

  const startWebSpeechInstance = useCallback(() => {
    const Ctor = speechCtorRef.current
    if (!Ctor || closingRef.current || finishingRef.current) return
    sessionBaseRef.current = chromeTranscriptRef.current
    const recognition = new Ctor()
    recognition.lang = 'es-419'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 5
    recognitionRef.current = recognition

    recognition.onresult = (event) => {
      if (finishingRef.current || closingRef.current) return
      currencyHintRef.current = mergeCurrencyHints(
        currencyHintRef.current,
        currencyWordsFromSpeechEvent(event),
      )
      const session = applySpokenCurrencyHint(
        transcriptFromSpeechEvent(event),
        currencyHintRef.current,
      )
      const joined = joinTranscriptChunks(sessionBaseRef.current, session)
      const shown = applySpokenCurrencyHint(joined, currencyHintRef.current)
      chromeTranscriptRef.current = shown
      setUi({ phase: 'listening', transcript: shown })
    }
    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
    }
    recognition.onend = () => {
      if (closingRef.current || finishingRef.current) return
      recognitionRef.current = null
      window.setTimeout(() => {
        if (closingRef.current || finishingRef.current) return
        try {
          startWebSpeechInstance()
        } catch {
          /* Whisper sigue grabando */
        }
      }, 120)
    }
    try {
      recognition.start()
    } catch {
      /* Whisper alcanza */
    }
  }, [])

  const transcribeWithWhisper = useCallback(async () => {
    if (closingRef.current) return
    const chromeText = applySpokenCurrencyHint(
      chromeTranscriptRef.current.trim(),
      currencyHintRef.current,
    )
    const chunks = chunksRef.current
    chunksRef.current = []
    const waitForWhisper = !chromeText || needsCurrencyFallback(chromeText)

    if (!chromeText && chunks.length === 0) {
      setUi({
        phase: 'error',
        transcript: '',
        message: 'No se escuchó nada. Probá de nuevo.',
      })
      return
    }

    if (!waitForWhisper || chunks.length === 0) {
      interpretTranscript(chromeText)
      return
    }

    setUi({ phase: 'transcribing', transcript: chromeText })

    try {
      const { preloadWhisper } = await import('@/services/voice/whisperTranscribe')
      await preloadWhisper()
      if (closingRef.current) return
      const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' })
      const audio = await blobToWhisperAudio(blob)
      const whisperText = await transcribeSpanishAudio(audio)
      if (closingRef.current) return
      const merged = mergeVoiceTranscripts(chromeText, whisperText)
      if (merged) interpretTranscript(merged)
      else if (whisperText) interpretTranscript(whisperText)
      else interpretTranscript(chromeText)
    } catch {
      if (closingRef.current) return
      if (chromeText) {
        interpretTranscript(chromeText)
        return
      }
      setUi({
        phase: 'error',
        transcript: '',
        message: 'No se pudo transcribir el audio. Probá de nuevo.',
      })
    }
  }, [interpretTranscript])

  const finishListening = useCallback(
    (_override?: string) => {
      if (finishingRef.current || closingRef.current) return
      finishingRef.current = true
      clearTimers()
      stopWebSpeech()
      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = () => {
          stopStream()
          void transcribeWithWhisper()
        }
        stopRecorder()
        return
      }
      stopStream()
      void transcribeWithWhisper()
    },
    [clearTimers, stopRecorder, stopStream, stopWebSpeech, transcribeWithWhisper],
  )

  const reinterpret = useCallback(
    (transcript: string) => {
      interpretTranscript(transcript)
    },
    [interpretTranscript],
  )

  const startVad = useCallback(
    (stream: MediaStream) => {
      const context = new AudioContext()
      audioContextRef.current = context
      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      analyserRef.current = analyser
      hadSpeechRef.current = false
      speechStartedAtRef.current = 0
      silenceSinceRef.current = null
      const data = new Uint8Array(new ArrayBuffer(analyser.fftSize))

      vadTimerRef.current = window.setInterval(() => {
        if (finishingRef.current || closingRef.current) return
        analyser.getByteTimeDomainData(data)
        const rms = rmsFromTimeDomain(data)
        const now = Date.now()
        if (rms >= SPEECH_RMS) {
          if (!hadSpeechRef.current) speechStartedAtRef.current = now
          hadSpeechRef.current = true
          silenceSinceRef.current = null
          return
        }
        if (!hadSpeechRef.current) return
        if (now - speechStartedAtRef.current < MIN_SPEECH_MS) return
        if (silenceSinceRef.current == null) silenceSinceRef.current = now
        if (now - silenceSinceRef.current >= SILENCE_MS) {
          finishListening()
        }
      }, 80)
    },
    [finishListening],
  )

  const startListening = useCallback(
    async (context: VoiceInterpretContext) => {
      closingRef.current = false
      finishingRef.current = false
      contextRef.current = context
      chunksRef.current = []
      chromeTranscriptRef.current = ''
      currencyHintRef.current = []
      sessionBaseRef.current = ''
      setOpen(true)

      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setUi({ phase: 'unsupported' })
        return
      }

      setUi({ phase: 'listening', transcript: '' })

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (closingRef.current) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        const mimeType = pickRecorderMimeType()
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream)
        recorderRef.current = recorder
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data)
        }
        recorder.start(200)
        startVad(stream)
        speechCtorRef.current = getSpeechRecognitionCtor()
        startWebSpeechInstance()
        maxTimerRef.current = window.setTimeout(() => {
          finishListening()
        }, MAX_RECORD_MS)
      } catch (error) {
        if (closingRef.current) return
        setUi({
          phase: 'error',
          transcript: '',
          message:
            error instanceof Error
              ? error.message
              : 'No se pudo usar el micrófono. Probá de nuevo.',
        })
      }
    },
    [finishListening, startVad, startWebSpeechInstance],
  )

  useEffect(
    () => () => {
      clearTimers()
      stopWebSpeech()
      stopRecorder()
      stopStream()
    },
    [clearTimers, stopRecorder, stopStream, stopWebSpeech],
  )

  return {
    open,
    ui,
    startListening,
    finishListening,
    reinterpret,
    close,
  }
}
