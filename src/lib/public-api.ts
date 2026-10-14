/** Öffentliche API-Pfade ohne Session (NextAuth + Registrierung + Split-Share + Stripe-Webhook, der sich per Signatur ausweist). */
const PUBLIC_API_PATHS = [
  '/api/auth',
  '/api/split/public',
  '/api/stripe/webhook',
  '/api/billing/cancel-request',
] as const

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
