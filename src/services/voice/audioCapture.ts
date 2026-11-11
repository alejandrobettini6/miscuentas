const TARGET_SAMPLE_RATE = 16_000

export function mixToMono(buffer: AudioBuffer): Float32Array {
  const channels = buffer.numberOfChannels
  const length = buffer.length
  if (channels === 1) return buffer.getChannelData(0).slice()
  const mixed = new Float32Array(length)
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < length; i++) mixed[i] += data[i] ?? 0
  }
  for (let i = 0; i < length; i++) mixed[i] /= channels
  return mixed
}

export function resampleLinear(
  input: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate) return input
  const ratio = fromRate / toRate
  const outLength = Math.max(1, Math.round(input.length / ratio))
  const output = new Float32Array(outLength)
  for (let i = 0; i < outLength; i++) {
    const src = i * ratio
    const i0 = Math.floor(src)
    const i1 = Math.min(i0 + 1, input.length - 1)
    const frac = src - i0
    output[i] = (input[i0] ?? 0) * (1 - frac) + (input[i1] ?? 0) * frac
  }
  return output
}

export async function blobToWhisperAudio(blob: Blob): Promise<Float32Array> {
  const context = new AudioContext()
  const decoded = await context.decodeAudioData(await blob.arrayBuffer())
  const mono = mixToMono(decoded)
  const samples = resampleLinear(mono, decoded.sampleRate, TARGET_SAMPLE_RATE)
  await context.close()
  return samples
}

export function pickRecorderMimeType(): string | undefined {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  return types.find((type) => MediaRecorder.isTypeSupported(type))
}

export function rmsFromTimeDomain(data: Uint8Array): number {
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    const centered = ((data[i] ?? 128) - 128) / 128
    sum += centered * centered
  }
  return Math.sqrt(sum / Math.max(1, data.length))
}
