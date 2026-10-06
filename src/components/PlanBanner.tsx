'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useUserSettings } from '@/hooks/useUserSettings'
import { PLAN_LABELS, daysLeft } from '@/lib/plans'

const FULL = `„${PLAN_LABELS.FULL}“`
const START = `„${PLAN_LABELS.BASIC}“`

function dismissedKey(userId: string) {
  return `plan-trial-ended-dismissed:${userId}`
}

function readDismissed(userId: string): boolean {
  try {
    return window.localStorage.getItem(dismissedKey(userId)) === '1'
  } catch {
    return false
  }
}

function daysLabel(days: number): string {
  return days === 1 ? 'Noch 1 Tag' : `Noch ${days} Tage`
}

/**
 * Hinweise zum Level über dem Seiteninhalt: Schreibschutz des aktiven Kontos, laufende
 * Testphase (bis drei Tage vor Ende nur auf der Übersicht) und einmalig ihr Ende.
 */
export default function PlanBanner() {
  const pathname = usePathname()
  const { settings, loading } = useUserSettings()
  const [dismissedFor, setDismissedFor] = useState<string | null>(null)

  if (loading || !settings?.plansEnabled) return null

  const linkToPlan = (
    <Link href="/settings#plan" className="font-medium text-accent underline">
      Level ansehen
    </Link>
  )
  const frame = (tone: 'pending' | 'muted', content: React.ReactNode, onDismiss?: () => void) => (
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
      <div
        role="status"
        className={`flex items-start gap-3 rounded-card px-4 py-3 text-sm ${
          tone === 'pending' ? 'bg-pending-bg text-primary' : 'bg-surface-muted text-primary'
        }`}
      >
        <p className="min-w-0 flex-1">{content}</p>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Hinweis schließen"
            className="-m-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-secondary hover:bg-surface hover:text-primary"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )

  if (settings.planLock === 'limit') {
    return frame(
      'pending',
      <>
        Dieses Konto ist schreibgeschützt, weil das Level {START} nur ein Konto umfasst. Du kannst
        es weiter ansehen, sichern und löschen. {linkToPlan}
      </>
    )
  }

  if (settings.planLock === 'shared') {
    return frame(
      'pending',
      <>Dieses Konto ist schreibgeschützt, weil der Inhaber das Level {START} hat.</>
    )
  }

  if (settings.planSource !== 'TRIAL') return null

  if (settings.plan === 'FULL') {
    const days = daysLeft(settings.planExpiresAt)
    if (days === null) return null
    const closing = days <= 3
    if (!closing && pathname !== '/') return null
    return frame(
      closing ? 'pending' : 'muted',
      <>
        {daysLabel(days)} {FULL} zum Testen. Danach gilt das kostenlose Level {START}, deine Daten
        bleiben erhalten. {linkToPlan}
      </>
    )
  }

  // Testphase beendet: einmal darauf hinweisen
  if (dismissedFor === settings.id || readDismissed(settings.id)) return null
  return frame(
    'muted',
    <>
      Deine Testphase ist beendet – es gilt jetzt das Level {START}. Deine Daten bleiben erhalten.{' '}
      {linkToPlan}
    </>,
    () => {
      try {
        window.localStorage.setItem(dismissedKey(settings.id), '1')
      } catch {
        // ohne Speicher gilt das Schließen nur bis zum Neuladen
      }
      setDismissedFor(settings.id)
    }
  )
}
