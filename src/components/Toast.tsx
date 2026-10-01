'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircleIcon, XCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'

export type ToastType = 'success' | 'error' | 'warning'

/** Optionale Aktion in der Meldung, z. B. „Rückgängig“ */
export type ToastAction = {
  label: string
  onClick: () => void
}

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
  stackIndex?: number
  action?: ToastAction
}

const EXIT_DURATION_MS = 200

export default function Toast({
  message,
  type,
  onClose,
  duration = 3000,
  stackIndex = 0,
  action,
}: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)

  const requestClose = useCallback(() => {
    setIsExiting((prev) => (prev ? prev : true))
  }, [])

  useKeyboardNavigation({
    onEscape: requestClose,
  })

  useEffect(() => {
    const timer = setTimeout(requestClose, duration)
    return () => clearTimeout(timer)
  }, [duration, requestClose])

  useEffect(() => {
    if (!isExiting) return
    const timer = setTimeout(onClose, EXIT_DURATION_MS)
    return () => clearTimeout(timer)
  }, [isExiting, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-income" aria-label="Erfolg" />
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-expense" aria-label="Fehler" />
      case 'warning':
        return <ExclamationCircleIcon className="h-6 w-6 text-pending" aria-label="Warnung" />
    }
  }

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-income-bg text-income border-income/30'
      case 'error':
        return 'bg-expense-bg text-expense border-expense/30'
      case 'warning':
        return 'bg-pending-bg text-pending border-pending/30'
    }
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        relative flex items-center p-4 max-w-sm
        rounded-card border shadow-raised backdrop-blur-sm
        ${getStyles()}
        ${isExiting ? 'animate-fade-out-down' : 'animate-fade-in-up'}
      `}
      style={{ marginBottom: stackIndex > 0 ? 0 : undefined }}
    >
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="ml-3 mr-8">
        <p className="text-sm font-medium">{message}</p>
        <p className="text-xs text-secondary mt-1 opacity-80">
          Drücke ESC zum Schließen
        </p>
        {action && (
          <button
            type="button"
            onClick={() => {
              action.onClick()
              requestClose()
            }}
            className="mt-2 inline-flex min-h-9 items-center rounded-control bg-surface px-3 text-sm font-semibold text-primary ring-1 ring-hairline hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={requestClose}
        className="absolute right-1 top-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-control hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 md:min-h-0 md:min-w-0 md:p-1.5 md:right-2 md:top-2"
        aria-label="Benachrichtigung schließen"
      >
        <XCircleIcon className="h-5 w-5" />
      </button>
    </div>
  )
}
