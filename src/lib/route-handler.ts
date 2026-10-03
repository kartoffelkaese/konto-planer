import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Fängt unerwartete Fehler eines Route-Handlers ab: Log mit Endpunkt und JSON-500,
 * wie es die Routen mit eigenem try/catch tun. Erwartete Antworten (4xx) bleiben unberührt.
 */
export function withErrorHandling<Args extends unknown[]>(
  endpoint: string,
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (error) {
      logger.error('Unerwarteter Fehler', error, { endpoint })
      return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 })
    }
  }
}
