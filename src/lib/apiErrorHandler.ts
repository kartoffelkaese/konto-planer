import { NextResponse } from 'next/server'
import { logger } from './logger'
import { auth } from './auth'

/**
 * Wrapper für API-Route-Handler, der automatisch Fehler loggt
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (error) {
      // Versuche, die Request-Informationen zu extrahieren
      const request = args[0] as Request
      const url = request?.url || 'unknown'
      const method = request?.method || 'unknown'
      
      // Versuche, User-Informationen zu bekommen (async)
      let userId = 'unknown'
      try {
        const session = await auth()
        userId = session?.user?.email || 'anonymous'
      } catch {
        // Ignoriere Fehler beim Abrufen der Session
      }

      logger.error(
        `API Error: ${method} ${url}`,
        error instanceof Error ? error : new Error(String(error)),
        {
          endpoint: url,
          method,
          userId
        }
      )

      // Wenn es bereits eine NextResponse ist, gib sie zurück
      if (error instanceof Response) {
        return error
      }

      // Standard Error Response
      return NextResponse.json(
        { 
          error: 'Interner Server-Fehler',
          message: process.env.NODE_ENV === 'development' 
            ? (error instanceof Error ? error.message : String(error))
            : undefined
        },
        { status: 500 }
      )
    }
  }
}

