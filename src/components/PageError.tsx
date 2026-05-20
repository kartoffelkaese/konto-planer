'use client'

import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'

interface PageErrorProps {
  message: string
  onRetry?: () => void
  retryLabel?: string
  fullScreen?: boolean
}

export default function PageError({
  message,
  onRetry,
  retryLabel = 'Erneut versuchen',
  fullScreen = true,
}: PageErrorProps) {
  const wrapperClass = fullScreen
    ? 'min-h-screen bg-canvas flex flex-col items-center justify-center gap-4 p-8'
    : 'flex flex-col items-center justify-center gap-4 py-12 px-4'

  return (
    <div className={wrapperClass} role="alert">
      <div className="flex items-start gap-3 max-w-md bg-danger-subtle text-danger px-6 py-4 rounded-card border border-danger/20">
        <ExclamationCircleIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium">{message}</p>
      </div>
      {onRetry && (
        <Button type="button" variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
