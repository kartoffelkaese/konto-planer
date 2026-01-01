// Fallback für Client-Side (nur Console)
const isServer = typeof window === 'undefined'

// Datei-Pfade (nur auf dem Server verfügbar)
let ERROR_LOG_FILE = ''
let APP_LOG_FILE = ''

// Nur auf dem Server ausführen
if (isServer) {
  const fs = require('fs')
  const path = require('path')

  const LOG_DIR = path.join(process.cwd(), 'logs')
  ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log')
  APP_LOG_FILE = path.join(LOG_DIR, 'app.log')

  // Stelle sicher, dass das Log-Verzeichnis existiert
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

interface LogEntry {
  timestamp: string
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
  error?: {
    name: string
    message: string
    stack?: string
  }
  context?: Record<string, any>
  userId?: string
  requestId?: string
}

function formatLogEntry(entry: LogEntry): string {
  const logLine = {
    ...entry,
    timestamp: new Date().toISOString()
  }
  return JSON.stringify(logLine) + '\n'
}

function writeToFile(filePath: string, content: string) {
  if (!isServer) return // Nur auf dem Server
  
  try {
    const fs = require('fs')
    fs.appendFileSync(filePath, content, 'utf8')
  } catch (error) {
    // Fallback: console.error wenn Datei-Schreiben fehlschlägt
    console.error('Failed to write to log file:', error)
    console.error('Original log:', content)
  }
}

export const logger = {
  error: (message: string, error?: Error | unknown, context?: Record<string, any>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context
    }

    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    } else if (error) {
      entry.error = {
        name: 'UnknownError',
        message: String(error)
      }
    }

    const logLine = formatLogEntry(entry)
    writeToFile(ERROR_LOG_FILE, logLine)
    writeToFile(APP_LOG_FILE, logLine)
    
    // Auch in Console ausgeben
    console.error('[ERROR]', message, error, context)
  },

  warn: (message: string, context?: Record<string, any>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context
    }

    const logLine = formatLogEntry(entry)
    writeToFile(APP_LOG_FILE, logLine)
    console.warn('[WARN]', message, context)
  },

  info: (message: string, context?: Record<string, any>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context
    }

    const logLine = formatLogEntry(entry)
    writeToFile(APP_LOG_FILE, logLine)
    console.log('[INFO]', message, context)
  },

  debug: (message: string, context?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development') {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'debug',
        message,
        context
      }

      const logLine = formatLogEntry(entry)
      writeToFile(APP_LOG_FILE, logLine)
      console.debug('[DEBUG]', message, context)
    }
  }
}

// Unhandled Error Handler (nur auf dem Server)
if (isServer && typeof process !== 'undefined') {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', error, {
      type: 'uncaughtException'
    })
    
    // Gib dem Logger Zeit, zu schreiben
    setTimeout(() => {
      process.exit(1)
    }, 1000)
  })

  process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
    const error = reason instanceof Error ? reason : new Error(String(reason))
    logger.error('Unhandled Promise Rejection', error, {
      type: 'unhandledRejection',
      promise: String(promise)
    })
  })
}

