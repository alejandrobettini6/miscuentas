import { env, pipeline, type ProgressInfo } from '@huggingface/transformers'

env.allowLocalModels = false

type AsrPipeline = Awaited<ReturnType<typeof pipeline<'automatic-speech-recognition'>>>

let transcriberPromise: Promise<AsrPipeline> | null = null

export type WhisperLoadProgress = {
  status?: string
  progress?: number
}

export function preloadWhisper(
  onProgress?: (progress: WhisperLoadProgress) => void,
): Promise<AsrPipeline> {
  if (!transcriberPromise) {
    transcriberPromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
      dtype: 'q8',
      progress_callback: (info: ProgressInfo) => {
        if (info.status === 'progress' || info.status === 'progress_total') {
          onProgress?.({ status: 'progress', progress: info.progress })
        }
      },
    })
  }
  return transcriberPromise
}

export async function transcribeSpanishAudio(audio: Float32Array): Promise<string> {
  const transcriber = await preloadWhisper()
  const result = await transcriber(audio, {
    language: 'spanish',
    task: 'transcribe',
  })
  const text = Array.isArray(result) ? result[0]?.text : result.text
  return (text ?? '').replace(/\s+/g, ' ').trim()
}
