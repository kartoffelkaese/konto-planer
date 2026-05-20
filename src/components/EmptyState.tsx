import Link from 'next/link'
import { Button } from '@/components/Button'

interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  actionHref?: string
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4 gap-3">
      <p className="text-sm font-medium text-primary">{title}</p>
      {description && (
        <p className="text-sm text-secondary max-w-sm">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button type="button" variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {actionLabel && actionHref && !onAction && (
        <Link
          href={actionHref}
          className={[
            'inline-flex items-center justify-center rounded-control font-medium transition-colors',
            'text-sm px-3 py-1.5 btn-primary border border-transparent shadow-sm',
          ].join(' ')}
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
