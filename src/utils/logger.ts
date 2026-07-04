type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function log(level: LogLevel, message: string, meta?: unknown): void {
  if (import.meta.env.PROD && level === 'debug') return
  const payload = meta === undefined ? [message] : [message, meta]
  // Preparado para integrar Sentry en producción.
  console[level](...payload)
}

export const logger = {
  debug: (message: string, meta?: unknown) => log('debug', message, meta),
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
}
