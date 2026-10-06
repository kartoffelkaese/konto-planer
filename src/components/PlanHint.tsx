import Link from 'next/link'
import { LockClosedIcon } from '@heroicons/react/24/outline'
import { getButtonClassName } from '@/components/Button'

type PlanHintProps = {
  /** Was gesperrt ist, z. B. „Statistiken gehören zum Level „Komplett“.“ */
  title: string
  description?: string
  /** Schmale Variante für Stellen innerhalb einer Karte (ohne eigene Fläche) */
  compact?: boolean
  className?: string
}

/** Hinweis an Stellen, an denen eine Funktion zum Level „Komplett“ gehört */
export default function PlanHint({ title, description, compact = false, className = '' }: PlanHintProps) {
  if (compact) {
    return (
      <p className={`flex items-start gap-2 text-sm text-secondary ${className}`}>
        <LockClosedIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {title}{' '}
          <Link href="/settings#plan" className="text-accent underline">
            Level ansehen
          </Link>
        </span>
      </p>
    )
  }

  return (
    <div className={`card flex flex-col items-center gap-3 px-4 py-10 text-center ${className}`}>
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-subtle text-accent">
        <LockClosedIcon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-primary">{title}</p>
      {description && <p className="max-w-sm text-sm text-secondary">{description}</p>}
      <Link href="/settings#plan" className={getButtonClassName({ variant: 'secondary', size: 'sm' })}>
        Level ansehen
      </Link>
    </div>
  )
}
