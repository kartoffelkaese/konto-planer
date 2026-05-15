'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircleIcon, XCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'

export type ToastType = 'success' | 'error' | 'warning'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

const EXIT_DURATION_MS = 200

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
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
        return <CheckCircleIcon className="h-6 w-6 text-green-400" aria-label="Erfolg" />
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-red-400" aria-label="Fehler" />
      case 'warning':
        return <ExclamationCircleIcon className="h-6 w-6 text-yellow-400" aria-label="Warnung" />
    }
  }

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800'
      case 'error':
        return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800'
      case 'warning':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800'
    }
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        fixed bottom-4 right-4 z-50
        flex items-center p-4
        rounded-lg border shadow-lg
        ${getStyles()}
        ${isExiting ? 'animate-fade-out-down' : 'animate-fade-in-up'}
      `}
    >
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="ml-3 mr-8">
        <p className="text-sm font-medium">{message}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Drücke ESC zum Schließen
        </p>
      </div>
      <button
        type="button"
        onClick={requestClose}
        className="absolute right-2 top-2 rounded-md p-1.5 hover:bg-opacity-10 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2"
        aria-label="Benachrichtigung schließen"
      >
        <XCircleIcon className="h-5 w-5" />
      </button>
    </div>
  )
}
