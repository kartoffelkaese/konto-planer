/**
 * Rechtstexte (Impressum, Datenschutz, AGB, Widerruf).
 *
 * Die Texte liegen als `content/legal/<slug>.md` außerhalb der Versionsverwaltung – jede
 * Installation hat ihre eigenen. Eine Seite gibt es nur, wenn ihre Datei vorhanden ist;
 * welche das sind, wird beim Build festgestellt (siehe next.config.js).
 */
export const LEGAL_PAGES = [
  { slug: 'impressum', label: 'Impressum' },
  { slug: 'datenschutz', label: 'Datenschutz' },
  { slug: 'agb', label: 'AGB' },
  { slug: 'widerruf', label: 'Widerruf' },
] as const

export type LegalSlug = (typeof LEGAL_PAGES)[number]['slug']

const available = new Set(
  (process.env.NEXT_PUBLIC_LEGAL_PAGES ?? '').split(',').filter(Boolean)
)

/** Rechtstexte, die es in dieser Installation gibt – für Verweise in Fußzeilen */
export const AVAILABLE_LEGAL_PAGES = LEGAL_PAGES.filter((page) => available.has(page.slug))

/** Kündigungsweg für das Abo („Verträge hier kündigen“) */
export const CANCEL_PATH = '/kuendigen'

/** Pfade, die ohne Anmeldung erreichbar sind */
export function isLegalPath(pathname: string): boolean {
  return (
    pathname === CANCEL_PATH ||
    pathname === `${CANCEL_PATH}/bestaetigen` ||
    LEGAL_PAGES.some((page) => pathname === `/${page.slug}`)
  )
}
