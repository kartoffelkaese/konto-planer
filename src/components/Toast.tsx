import { useEffect } from 'react'
import { CheckCircleIcon, XCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'

export type ToastType = 'success' | 'error' | 'warning'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useKeyboardNavigation({
    onEscape: onClose
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

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
        return 'bg-green-50 text-green-800 border-green-200'
      case 'error':
        return 'bg-red-50 text-red-800 border-red-200'
      case 'warning':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200'
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
        animate-fade-in-up
        transform transition-all duration-300 ease-in-out
      `}
    >
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="ml-3 mr-8">
        <p className="text-sm font-medium">{message}</p>
        <p className="text-xs text-gray-500 mt-1">
          Drücke ESC zum Schließen
        </p>
      </div>
      <button
        onClick={onClose}
        className="absolute right-2 top-2 rounded-md p-1.5 hover:bg-opacity-10 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2"
        aria-label="Benachrichtigung schließen"
      >
        <XCircleIcon className="h-5 w-5" />
      </button>
    </div>
  )
} 