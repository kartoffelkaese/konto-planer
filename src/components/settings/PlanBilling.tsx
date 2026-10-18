'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import SegmentedControl from '@/components/SegmentedControl'
import { useToast } from '@/hooks/useToast'
import { useUserSettings } from '@/hooks/useUserSettings'
import { getApiErrorMessage, openBillingPortal, startCheckout, syncBilling } from '@/lib/api'
import { formatCurrency } from '@/lib/formatters'
import { PLAN_LABELS, PLAN_PRICE } from '@/lib/plans'

type Interval = 'MONTHLY' | 'YEARLY'

/** Hintergrund-Abgleich höchstens einmal je Minute aus diesem Tab (der Server drosselt zusätzlich) */
const BACKGROUND_SYNC_INTERVAL_MS = 60 * 1000
let lastBackgroundSyncAt = 0

const INTERVAL_OPTIONS: { value: Interval; label: string }[] = [
  { value: 'YEARLY', label: `Jährlich · ${formatCurrency(PLAN_PRICE.yearly)}` },
  { value: 'MONTHLY', label: `Monatlich · ${formatCurrency(PLAN_PRICE.monthly)}` },
]

/**
 * Kauf und Verwaltung des Abos innerhalb von „Dein Level“. Bezahlt und verwaltet wird auf
 * Seiten von Stripe; hier wird nur dorthin weitergeleitet und bei der Rückkehr abgeglichen.
 */
export default function PlanBilling() {
  const router = useRouter()
  const { settings, plan, reload, refresh } = useUserSettings()
  const { showToast } = useToast()
  const [interval, setChosenInterval] = useState<Interval>('YEARLY')
  const [busy, setBusy] = useState<'checkout' | 'portal' | null>(null)

  const billing = settings?.billing
  const enabled = Boolean(billing?.enabled)

  // Rückkehr von Stripe („?billing=…“): sofort abgleichen, statt auf den Webhook zu warten.
  // Sonst beim Öffnen im Hintergrund abgleichen (der Server drosselt), falls ein Webhook
  // verloren ging – neu geladen wird nur, wenn sich etwas geändert hat.
  const hasCustomer = Boolean(billing?.hasCustomer)
  useEffect(() => {
    if (!enabled) return
    const outcome = new URLSearchParams(window.location.search).get('billing')
    if (!outcome) {
      if (!hasCustomer || Date.now() - lastBackgroundSyncAt < BACKGROUND_SYNC_INTERVAL_MS) return
      lastBackgroundSyncAt = Date.now()
      syncBilling({ background: true }).then(
        ({ changed }) => {
          if (changed) refresh()
        },
        () => undefined
      )
      return
    }
    router.replace('/settings#plan', { scroll: false })
    if (outcome === 'cancelled') return

    syncBilling().then(
      () => {
        reload()
        if (outcome === 'success') {
          showToast(`„${PLAN_LABELS.FULL}“ ist freigeschaltet`, 'success')
        }
      },
      (err: unknown) =>
        showToast(getApiErrorMessage(err, 'Der Abo-Stand konnte nicht abgerufen werden'), 'error')
    )
  }, [enabled, hasCustomer, router, reload, refresh, showToast])

  if (!settings || !billing?.enabled) return null

  // „Komplett“ von Hand oder als Bestand: kein Kaufangebot
  const byHand = settings.planSource === 'LEGACY' || settings.planSource === 'MANUAL'
  if (plan === 'FULL' && byHand && !billing.running) return null

  const redirect = async (kind: 'checkout' | 'portal') => {
    setBusy(kind)
    try {
      const { url } = kind === 'checkout' ? await startCheckout(interval) : await openBillingPortal()
      window.location.assign(url)
    } catch (err) {
      showToast(
        getApiErrorMessage(
          err,
          kind === 'checkout'
            ? 'Der Kauf konnte nicht gestartet werden'
            : 'Die Abo-Verwaltung konnte nicht geöffnet werden'
        ),
        'error'
      )
      setBusy(null)
    }
  }

  if (billing.running) {
    return (
      <div className="mt-5 space-y-3">
        {billing.status === 'past_due' && (
          <p className="rounded-control bg-pending-bg p-3 text-sm text-primary">
            Die Abbuchung hat nicht geklappt. Stripe versucht es in den nächsten Tagen erneut – prüfe
            bitte in der Abo-Verwaltung dein Zahlungsmittel, damit „{PLAN_LABELS.FULL}“ erhalten bleibt.
          </p>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={() => redirect('portal')}
          loading={busy === 'portal'}
          loadingText="Wird geöffnet…"
        >
          Abo verwalten
        </Button>
        <p className="text-xs text-secondary">
          Zahlungsmittel, Rechnungen und den Wechsel zwischen monatlich und jährlich findest du in
          der Abo-Verwaltung bei Stripe.
          {!billing.cancelAtPeriodEnd && (
            <>
              {' '}
              <Link href="/kuendigen" className="text-accent underline">
                Abo kündigen
              </Link>
            </>
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-5 space-y-3">
      <div>
        <h3 className="text-sm font-medium text-primary">„{PLAN_LABELS.FULL}“ buchen</h3>
        <p className="mt-1 text-sm text-secondary">
          Als Abo, jederzeit zum Ende des bezahlten Zeitraums kündbar. Bezahlt wird sicher über
          Stripe.
        </p>
      </div>
      <SegmentedControl
        ariaLabel="Abrechnung"
        className="grid w-full grid-cols-2 sm:max-w-md"
        options={INTERVAL_OPTIONS}
        value={interval}
        onChange={setChosenInterval}
        disabled={busy !== null}
      />
      <Button
        type="button"
        onClick={() => redirect('checkout')}
        loading={busy === 'checkout'}
        loadingText="Weiter zu Stripe…"
      >
        {PLAN_LABELS.FULL} buchen
      </Button>
      {billing.hasCustomer && (
        <p className="text-xs text-secondary">
          Frühere Rechnungen findest du in der{' '}
          <button
            type="button"
            className="text-accent underline"
            onClick={() => redirect('portal')}
            disabled={busy !== null}
          >
            Abo-Verwaltung
          </button>
          .
        </p>
      )}
    </div>
  )
}
