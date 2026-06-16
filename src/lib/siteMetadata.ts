export const SITE_NAME = 'Konto-Planer'

export const SITE_TITLE = 'Konto-Planer – Finanzen planen, nicht raten'

export const SITE_DESCRIPTION =
  'Finanzverwaltung für ein oder mehrere Konten: Gehaltsmonat, CSV-Import, Statistiken und gemeinsame Nutzung – kostenlos und auf Deutsch.'

export const SITE_OG_ALT = SITE_TITLE

/** Kanonische Basis-URL für Metadata (Open Graph, Canonical). */
export function getSiteUrl(): URL {
  const raw =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const normalized = raw.endsWith('/') ? raw.slice(0, -1) : raw
  return new URL(normalized)
}
