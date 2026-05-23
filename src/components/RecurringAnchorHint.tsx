'use client'

import { useState, useEffect } from 'react'
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline'

const STORAGE_KEY = 'recurring-anchor-hint-dismissed'

export default function RecurringAnchorHint() {
  const [dismissed, setDismissed] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === '1')
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setDismissed(true)
  }

  if (dismissed) {
    return null
  }

  return (
    <div className="mt-3 rounded-control border border-border bg-surface-muted/60 text-sm">
      <div className="flex items-start gap-2 p-3">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-start gap-2 text-left text-secondary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
          aria-expanded={expanded}
        >
          <span className="text-primary font-medium shrink-0">Hinweis:</span>
          <span className="flex-1">
            {expanded
              ? 'Anker-Datum und letzte Bestätigung'
              : 'Das Anker-Datum bestimmt die nächste Fälligkeit — nicht das Bestätigungsdatum.'}
          </span>
          {expanded ? (
            <ChevronUpIcon className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
          ) : (
            <ChevronDownIcon className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded-control text-secondary hover:text-primary hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Hinweis dauerhaft ausblenden"
        >
          <XMarkIcon className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {expanded && (
        <p className="px-3 pb-3 text-secondary border-t border-border pt-2">
          Das <strong className="font-medium text-primary">Anker-Datum</strong> (Tag der
          Anlage) legt fest, wann die nächste Zahlung fällig ist — unabhängig davon, wann Sie
          zuletzt bestätigt haben. Die{' '}
          <strong className="font-medium text-primary">letzte Bestätigung</strong> betrifft nur
          den Verlauf, nicht den nächsten Fälligkeitstermin.
        </p>
      )}
    </div>
  )
}
