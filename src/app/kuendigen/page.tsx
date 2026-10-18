'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import LegalLinks from '@/components/LegalLinks'
import PageLoader from '@/components/PageLoader'
import { useUserSettings } from '@/hooks/useUserSettings'
import { cancelSubscription, getApiErrorMessage, requestCancellation } from '@/lib/api'
import { formatDate } from '@/lib/dateUtils'
import { BILLING_ENABLED_PUBLIC, PLAN_LABELS } from '@/lib/plans'

/**
 * „Verträge hier kündigen“: Kündigung des Abos, erreichbar ohne Anmeldung.
 * Angemeldet wird direkt zum Periodenende gekündigt; ohne Anmeldung kommt ein Link an die
 * angegebene Adresse, mit dem die Kündigung bestätigt wird (`/kuendigen/bestaetigen`).
 */
export default function CancelPage() {
  const { status } = useSession()
  const { settings, loading, reload } = useUserSettings()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return <PageLoader message="Wird geladen…" />
  }

  const billing = settings?.billing
  // Ohne Einstellungen (z. B. Sitzung eines gelöschten Nutzers) gilt die Seite als abgemeldet –
  // dann bleibt die Kündigung per Bestätigungslink möglich
  const loggedIn = status === 'authenticated' && settings !== null
  const available = loggedIn ? Boolean(billing?.enabled) : BILLING_ENABLED_PUBLIC

  const run = async (action: () => Promise<string>) => {
    setBusy(true)
    setError(null)
    try {
      setDone(await action())
    } catch (err) {
      setError(getApiErrorMessage(err, 'Die Kündigung konnte nicht übermittelt werden. Bitte versuche es erneut.'))
    } finally {
      setBusy(false)
    }
  }

  const handleDirect = () =>
    run(async () => {
      const { endsAt } = await cancelSubscription()
      reload()
      return `Dein Abo ist zum ${formatDate(endsAt)} gekündigt. Bis dahin kannst du „${PLAN_LABELS.FULL}“ weiter nutzen. Eine Bestätigung ist per E-Mail unterwegs.`
    })

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault()
    void run(async () => {
      await requestCancellation(email.trim())
      return 'Wenn es zu dieser Adresse ein laufendes Abo gibt, bekommst du gleich eine E-Mail mit einem Link. Erst mit der Bestätigung über diesen Link wird gekündigt.'
    })
  }

  let content: React.ReactNode
  if (!available) {
    content = <p className="text-sm text-secondary">Hier gibt es derzeit keine kündbaren Verträge.</p>
  } else if (done) {
    content = (
      <p className="rounded-control bg-income-bg p-3 text-sm text-primary" role="status">
        {done}
      </p>
    )
  } else if (loggedIn && billing?.running && billing.cancelAtPeriodEnd) {
    content = (
      <p className="text-sm text-secondary">
        Dein Abo ist bereits gekündigt
        {billing.periodEnd ? ` und endet am ${formatDate(billing.periodEnd)}` : ''}.
      </p>
    )
  } else if (loggedIn && billing?.running) {
    content = (
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          Du kündigst dein Abo „{PLAN_LABELS.FULL}“ zum Ende{' '}
          {billing.status === 'trialing' ? 'deiner Testphase' : 'des bezahlten Zeitraums'}
          {billing.periodEnd ? ` (${formatDate(billing.periodEnd)})` : ''}.
          {billing.status === 'trialing' ? ' Abgebucht wird nichts.' : ''} Bis dahin kannst du alles
          weiter nutzen; danach gilt das kostenlose Level „{PLAN_LABELS.BASIC}“. Deine Daten bleiben
          erhalten.
        </p>
        <Button
          type="button"
          variant="danger"
          onClick={handleDirect}
          loading={busy}
          loadingText="Wird gekündigt…"
        >
          Jetzt kündigen
        </Button>
      </div>
    )
  } else if (loggedIn) {
    content = <p className="text-sm text-secondary">Du hast kein laufendes Abo.</p>
  } else {
    content = (
      <form onSubmit={handleRequest} className="space-y-4">
        <p className="text-sm text-secondary">
          Gib die E-Mail-Adresse an, mit der du bei KontoPlaner registriert bist. Wir schicken dir
          einen Link, mit dem du die Kündigung bestätigst – so kann niemand dein Abo ohne dich
          kündigen. Das Abo „{PLAN_LABELS.FULL}“ endet dann zum Ende des bezahlten Zeitraums. Wenn du{' '}
          <Link href="/auth/login" className="text-accent underline">
            angemeldet
          </Link>{' '}
          bist, kannst du hier sofort selbst kündigen.
        </p>
        <div>
          <label htmlFor="cancel-email" className="block text-sm font-medium text-primary">
            E-Mail-Adresse
          </label>
          <input
            id="cancel-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="mt-1 w-full"
          />
        </div>
        <Button type="submit" variant="danger" loading={busy} loadingText="Wird gesendet…">
          Jetzt kündigen
        </Button>
      </form>
    )
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-xl px-4 py-6 sm:px-6 md:py-8">
        <Link
          href={loggedIn ? '/settings#plan' : '/'}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-secondary transition-colors duration-feedback hover:text-accent"
        >
          <ArrowLeftIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {loggedIn ? 'Zu den Einstellungen' : 'Zur Startseite'}
        </Link>

        <div className="card mt-2 space-y-4 p-5 md:p-6">
          <h1 className="page-title">Vertrag kündigen</h1>
          {content}
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </div>

        <LegalLinks className="mt-6 justify-center" hideCancelLink />
      </div>
    </div>
  )
}
