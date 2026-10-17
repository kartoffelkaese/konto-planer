'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import LegalLinks from '@/components/LegalLinks'
import PageLoader from '@/components/PageLoader'
import { confirmCancellation, getApiErrorMessage } from '@/lib/api'
import { formatDate } from '@/lib/dateUtils'
import { PLAN_LABELS } from '@/lib/plans'

/**
 * Kündigung ohne Anmeldung bestätigen: Der Link aus der E-Mail öffnet diese Seite, gekündigt
 * wird erst mit dem Knopf (damit Mail-Scanner beim Prüfen des Links nichts auslösen).
 */
function ConfirmCancellation() {
  const token = useSearchParams().get('token') ?? ''
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const handleConfirm = async () => {
    setBusy(true)
    setError(null)
    try {
      const { endsAt } = await confirmCancellation(token)
      setDone(
        endsAt
          ? `Dein Abo „${PLAN_LABELS.FULL}“ ist zum ${formatDate(endsAt)} gekündigt. Bis dahin kannst du alles weiter nutzen. Eine Bestätigung ist per E-Mail unterwegs.`
          : 'Zu deiner Adresse läuft kein Abo mehr – es gibt nichts zu kündigen.'
      )
    } catch (err) {
      setError(getApiErrorMessage(err, 'Die Kündigung konnte nicht bestätigt werden. Bitte versuche es erneut.'))
    } finally {
      setBusy(false)
    }
  }

  let content: React.ReactNode
  if (done) {
    content = (
      <p className="rounded-control bg-income-bg p-3 text-sm text-primary" role="status">
        {done}
      </p>
    )
  } else if (!token) {
    content = (
      <p className="text-sm text-secondary">
        Der Link ist unvollständig. Öffne ihn bitte direkt aus der E-Mail oder{' '}
        <Link href="/kuendigen" className="text-accent underline">
          fordere einen neuen an
        </Link>
        .
      </p>
    )
  } else {
    content = (
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          Mit dem Knopf kündigst du dein Abo „{PLAN_LABELS.FULL}“ zum Ende des bezahlten Zeitraums.
          Bis dahin kannst du alles weiter nutzen; danach gilt das kostenlose Level „
          {PLAN_LABELS.BASIC}“. Deine Daten bleiben erhalten.
        </p>
        <Button type="button" variant="danger" onClick={handleConfirm} loading={busy} loadingText="Wird gekündigt…">
          Kündigung bestätigen
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-xl px-4 py-6 sm:px-6 md:py-8">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-secondary transition-colors duration-feedback hover:text-accent"
        >
          <ArrowLeftIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          Zur Startseite
        </Link>

        <div className="card mt-2 space-y-4 p-5 md:p-6">
          <h1 className="page-title">Kündigung bestätigen</h1>
          {content}
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
              {' '}
              <Link href="/kuendigen" className="underline">
                Neuen Link anfordern
              </Link>
            </p>
          )}
        </div>

        <LegalLinks className="mt-6 justify-center" />
      </div>
    </div>
  )
}

export default function ConfirmCancellationPage() {
  return (
    <Suspense fallback={<PageLoader message="Wird geladen…" />}>
      <ConfirmCancellation />
    </Suspense>
  )
}
