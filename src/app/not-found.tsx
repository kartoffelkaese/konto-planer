import Link from 'next/link'
import { HomeIcon } from '@heroicons/react/24/outline'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-semibold tabular-nums text-accent">404</p>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-primary">Seite nicht gefunden</h2>
        <p className="mt-2 text-secondary">
          Die angeforderte Seite konnte leider nicht gefunden werden.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="btn-primary inline-flex items-center px-6 py-3 text-base font-medium rounded-control"
          >
            <HomeIcon className="h-5 w-5 mr-2" />
            Zur Startseite
          </Link>
          <p className="mt-4 text-sm text-secondary">KontoPlaner – Ihre Finanzen im Griff</p>
        </div>
      </div>
    </div>
  )
}
