import Link from 'next/link'
import { AVAILABLE_LEGAL_PAGES, CANCEL_PATH } from '@/lib/legalPages'
import { BILLING_ENABLED_PUBLIC } from '@/lib/plans'

const linkClass =
  'inline-flex min-h-11 items-center text-secondary transition-colors duration-feedback hover:text-primary'

/**
 * Verweise auf die vorhandenen Rechtstexte und – wenn „Komplett“ buchbar ist – auf den
 * Kündigungsweg. Gibt es beides nicht, wird nichts ausgegeben.
 * `hideCancelLink` lässt den Kündigungsweg weg (auf der Kündigungsseite selbst).
 */
export default function LegalLinks({
  className = '',
  hideCancelLink = false,
}: {
  className?: string
  hideCancelLink?: boolean
}) {
  const showCancelLink = BILLING_ENABLED_PUBLIC && !hideCancelLink
  if (AVAILABLE_LEGAL_PAGES.length === 0 && !showCancelLink) return null

  return (
    <nav aria-label="Rechtliches" className={`flex flex-wrap gap-x-4 gap-y-1 text-sm ${className}`}>
      {AVAILABLE_LEGAL_PAGES.map((page) => (
        <Link
          key={page.slug}
          href={`/${page.slug}`}
          className={linkClass}
        >
          {page.label}
        </Link>
      ))}
      {showCancelLink && (
        <Link href={CANCEL_PATH} className={linkClass}>
          Verträge hier kündigen
        </Link>
      )}
    </nav>
  )
}
