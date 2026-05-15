/** Öffentliche API-Pfade ohne Session (NextAuth + Registrierung). */
const PUBLIC_API_PATHS = [
  '/api/auth',
] as const

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
