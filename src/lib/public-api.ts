/** Öffentliche API-Pfade ohne Session (NextAuth + Registrierung + Split-Share). */
const PUBLIC_API_PATHS = [
  '/api/auth',
  '/api/split/public',
] as const

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
