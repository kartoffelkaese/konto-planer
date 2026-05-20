import LoadingSpinner from '@/components/LoadingSpinner'

interface PageLoaderProps {
  message?: string
  fullScreen?: boolean
}

export default function PageLoader({
  message = 'Wird geladen…',
  fullScreen = true,
}: PageLoaderProps) {
  const wrapperClass = fullScreen
    ? 'min-h-screen bg-canvas flex flex-col items-center justify-center gap-3 p-8'
    : 'flex flex-col items-center justify-center gap-3 py-12'

  return (
    <div className={wrapperClass} role="status" aria-live="polite">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-secondary">{message}</p>
    </div>
  )
}
