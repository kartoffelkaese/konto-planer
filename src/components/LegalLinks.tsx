import Link from 'next/link'
import { AVAILABLE_LEGAL_PAGES, CANCEL_PATH } from '@/lib/legalPages'
import { BILLING_ENABLED_PUBLIC } from '@/lib/plans'

const linkClass =
  'inline-flex min-h-11 items-center text-secondary transition-colors duration-feedback hover:text-primary'

/**
 * Verweise auf die vorhandenen Rechtstexte und – wenn „Komplett“ buchbar ist – auf den
 * Kündigungsweg. Gibt es beides nicht, wird nichts ausgegeben.
 */
export default function LegalLinks({ className = '' }: { className?: string }) {
  if (AVAILABLE_LEGAL_PAGES.length === 0 && !BILLING_ENABLED_PUBLIC) return null

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
      {BILLING_ENABLED_PUBLIC && (
        <Link href={CANCEL_PATH} className={linkClass}>
          Verträge hier kündigen
        </Link>
      )}
    </nav>
  )
}
