/**
 * In-Memory rate limiting (pro Prozess).
 * Bei mehreren PM2-Instanzen gilt das Limit je Instanz separat.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export type RateLimitConfig = {
  /** Max. Anfragen im Fenster */
  limit: number
  /** Fenster in Millisekunden */
  windowMs: number
}

export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  errorLog: { limit: 30, windowMs: 60 * 60 * 1000 },
  emailChange: { limit: 5, windowMs: 60 * 60 * 1000 },
  accountDelete: { limit: 3, windowMs: 60 * 60 * 1000 },
  csvImport: { limit: 10, windowMs: 15 * 60 * 1000 },
  backupRestore: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitConfig>

/** Nur bei TRUST_PROXY=true X-Forwarded-For vertrauen (Reverse-Proxy). */
export function getClientIp(headers: Headers): string {
  const trustProxy = process.env.TRUST_PROXY === 'true'

  if (trustProxy) {
    const forwarded = headers.get('x-forwarded-for')
    if (forwarded) {
      return forwarded.split(',')[0]?.trim() || 'unknown'
    }
    const realIp = headers.get('x-real-ip')?.trim()
    if (realIp) return realIp
  }

  return 'direct'
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now()
  const bucketKey = `${key}:${config.windowMs}`
  let bucket = buckets.get(bucketKey)

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + config.windowMs }
    buckets.set(bucketKey, bucket)
  }

  bucket.count += 1

  if (bucket.count > config.limit) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    }
  }

  return { allowed: true }
}

/** Für Login: Key aus E-Mail (verhindert Enumeration über IP allein) */
export function loginRateLimitKey(ip: string, email: string): string {
  return `login:${ip}:${email.toLowerCase().trim()}`
}
