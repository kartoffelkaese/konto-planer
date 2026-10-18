'use client'

import { useState } from 'react'
import { ArrowUpTrayIcon, DocumentMagnifyingGlassIcon, LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/Modal'
import { Button } from '@/components/Button'

function seenKey(userId: string) {
  return `recurring-detection-intro-seen:${userId}`
}

function readSeen(userId: string): boolean {
  try {
    return window.localStorage.getItem(seenKey(userId)) === '1'
  } catch {
    // Ohne Speicher lieber nicht bei jedem Besuch erneut zeigen
    return true
  }
}

function markSeen(userId: string) {
  try {
    window.localStorage.setItem(seenKey(userId), '1')
  } catch {
    // ohne Speicher gilt „gesehen“ nur bis zum Neuladen
  }
}

const POINTS = [
  {
    icon: DocumentMagnifyingGlassIcon,
    title: 'Vorschläge aus deinem Kontoauszug',
    text: 'Lade die Umsätze als CSV-Datei aus deinem Online-Banking hoch (DKB oder ING). Wir finden regelmäßige Einnahmen und Ausgaben – auch schwankende Beträge, Preisänderungen und den Tag deines Gehaltseingangs.',
  },
  {
    icon: ArrowUpTrayIcon,
    title: 'Am besten 18 Monate',
    text: 'Je länger der Zeitraum, desto besser die Erkennung. Mit 1,5 Jahren werden auch jährliche Zahlungen wie Versicherungen oder Mitgliedsbeiträge sicher erkannt.',
  },
  {
    icon: LockClosedIcon,
    title: 'Deine Datei bleibt bei uns – und nur kurz',
    text: 'Die Datei wird ausschließlich auf dem Konto-Planer-Server ausgewertet und an niemanden weitergegeben. Sie wird nicht gespeichert, sondern direkt nach der Auswertung verworfen.',
  },
  {
    icon: CheckCircleIcon,
    title: 'Du entscheidest',
    text: 'Angelegt wird nur, was du auswählst. Betrag, Intervall und Kategorie kannst du vorher anpassen.',
  },
]

/**
 * Einmalige Einführung in „Aus Kontoauszug erkennen“, wenn jemand die Seite „Wiederkehrend“
 * zum ersten Mal öffnet und noch keine wiederkehrenden Zahlungen hat.
 */
export default function RecurringDetectionIntro({
  userId,
  eligible,
  onStart,
}: {
  userId: string | null
  /** Noch keine wiederkehrenden Zahlungen und Schreibrecht */
  eligible: boolean
  onStart: () => void
}) {
  const [closedFor, setClosedFor] = useState<string | null>(null)
  const open = Boolean(userId) && eligible && closedFor !== userId && !readSeen(userId!)

  const close = () => {
    if (!userId) return
    markSeen(userId)
    setClosedFor(userId)
  }

  return (
    <Modal isOpen={open} onClose={close} title="Wiederkehrende Zahlungen automatisch erkennen" maxWidth="lg">
      <div className="space-y-5">
        <p className="text-sm text-secondary">
          Damit Konto-Planer weiß, was in den nächsten Monaten kommt, braucht es deine
          wiederkehrenden Zahlungen. Statt alles von Hand herauszusuchen, kannst du sie dir aus
          deinem Kontoauszug vorschlagen lassen.
        </p>
        <ul className="space-y-4">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent-subtle text-accent">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium text-primary">{title}</p>
                <p className="text-sm text-secondary">{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={close}>
            Später
          </Button>
          <Button
            type="button"
            onClick={() => {
              close()
              onStart()
            }}
          >
            Kontoauszug hochladen
          </Button>
        </div>
      </div>
    </Modal>
  )
}
