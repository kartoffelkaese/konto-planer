'use client'

import { ArrowDownTrayIcon, ArrowUpOnSquareIcon, PlusIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import { useCanInstallApp, useInstallPrompt } from '@/contexts/InstallPromptContext'

/** Anleitung für iPhone/iPad – dort gibt es kein Installationsfenster */
export function IosInstallSteps() {
  return (
    <ol className="space-y-2 text-sm text-primary">
      <li className="flex items-center gap-2">
        <ArrowUpOnSquareIcon className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        Tippe in Safari auf „Teilen“.
      </li>
      <li className="flex items-center gap-2">
        <PlusIcon className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        Wähle „Zum Home-Bildschirm“.
      </li>
    </ol>
  )
}

/** Karte in den Einstellungen: nur sichtbar, solange die App hier installierbar ist */
export default function InstallAppCard() {
  const canInstall = useCanInstallApp()
  const { canPrompt, promptInstall } = useInstallPrompt()

  if (!canInstall) return null

  return (
    <div id="install-app" className="card p-4 md:p-5 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-primary mb-1">Als App installieren</h3>
        <p className="text-sm text-secondary">
          KontoPlaner bekommt ein eigenes Symbol und öffnet sich ohne Browser-Leisten.
        </p>
      </div>
      {canPrompt ? (
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={() => void promptInstall()}>
            <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
            Installieren
          </Button>
        </div>
      ) : (
        <IosInstallSteps />
      )}
    </div>
  )
}
