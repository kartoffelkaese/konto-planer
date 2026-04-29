type LogContext = Record<string, unknown> | undefined

function serializeError(error?: Error | unknown) {
  if (error === undefined) return undefined
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack }
  }
  return { message: String(error) }
}

export const logger = {
  error: (message: string, error?: Error | unknown, context?: LogContext) => {
    console.error('[ERROR]', message, { ...context, error: serializeError(error) })
  },
  warn: (message: string, context?: LogContext) => {
    console.warn('[WARN]', message, context ?? '')
  },
  info: (message: string, context?: LogContext) => {
    console.info('[INFO]', message, context ?? '')
  },
  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[DEBUG]', message, context ?? '')
    }
  }
}
