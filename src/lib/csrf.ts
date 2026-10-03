const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Schutz gegen Cross-Site-Requests zusätzlich zu den SameSite-Cookies: Schickt der Browser
 * einen Origin-Header mit, muss er zum eigenen Host passen. Anfragen ohne Origin (z. B. curl)
 * kommen nicht aus fremden Webseiten und bleiben erlaubt.
 */
export function isCrossSiteRequest(method: string, headers: Headers): boolean {
  if (!STATE_CHANGING_METHODS.has(method)) return false
  const origin = headers.get('origin')
  if (!origin) return false
  const host = headers.get('x-forwarded-host') ?? headers.get('host')
  if (!host) return true
  try {
    return new URL(origin).host !== host.split(',')[0].trim()
  } catch {
    // z. B. „null“ aus Sandbox-Frames
    return true
  }
}
