// Initialisiere Logger beim App-Start
import { logger } from './logger'

// Logge App-Start
logger.info('Application started', {
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT || 3000,
  timestamp: new Date().toISOString()
})

// Logge wichtige Umgebungsvariablen (ohne sensible Daten)
logger.debug('Environment configuration', {
  nodeEnv: process.env.NODE_ENV,
  hasDatabaseUrl: !!process.env.DATABASE_URL,
  hasAuthSecret: !!process.env.AUTH_SECRET
})

export {}

