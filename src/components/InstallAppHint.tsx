'use client'

import { useState } from 'react'
import { DevicePhoneMobileIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { getButtonClassName } from '@/components/Button'
import { IosInstallSteps } from '@/components/InstallAppCard'
import { useCanInstallApp, useInstallPrompt } from '@/contexts/InstallPromptContext'

const DISMISSED_KEY = 'installHintDismissed'

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/** Dezenter Hinweis auf der Startseite; „Schließen“ blendet ihn dauerhaft aus */
export default function InstallAppHint({ className = '' }: { className?: string }) {
  const canInstall = useCanInstallApp()
  const { canPrompt, promptInstall } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(false)
  const [showSteps, setShowSteps] = useState(false)

  if (!canInstall || dismissed || readDismissed()) return null

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // ohne Speicher gilt das Schließen nur bis zum Neuladen
    }
    setDismissed(true)
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-center gap-1 lg:justify-start">
        <button
          type="button"
          onClick={() => (canPrompt ? void promptInstall() : setShowSteps((open) => !open))}
          aria-expanded={canPrompt ? undefined : showSteps}
          className={getButtonClassName({ variant: 'ghost', size: 'sm', className: 'rounded-pill' })}
        >
          <DevicePhoneMobileIcon className="h-4 w-4" aria-hidden="true" />
          Als App installieren
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Hinweis zur App ausblenden"
          className={getButtonClassName({ variant: 'ghost', size: 'sm', className: 'rounded-pill px-2' })}
        >
          <XMarkIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {showSteps && (
        <div className="card mx-auto mt-3 max-w-xs p-4 text-left lg:mx-0">
          <IosInstallSteps />
        </div>
      )}
    </div>
  )
}
