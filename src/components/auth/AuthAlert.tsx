import type { ReactNode } from 'react'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'

type AuthAlertVariant = 'success' | 'error' | 'info'

type AuthAlertProps = {
  variant: AuthAlertVariant
  children: ReactNode
  title?: string
  actions?: ReactNode
}

const variantStyles: Record<
  AuthAlertVariant,
  { container: string; icon: string; Icon: typeof CheckCircleIcon }
> = {
  success: {
    container: 'border-income/30 bg-income-bg text-income',
    icon: 'text-income',
    Icon: CheckCircleIcon,
  },
  error: {
    container: 'border-danger/30 bg-danger-subtle text-danger',
    icon: 'text-danger',
    Icon: ExclamationTriangleIcon,
  },
  info: {
    container: 'border-accent-border bg-accent-subtle text-primary',
    icon: 'text-accent',
    Icon: InformationCircleIcon,
  },
}

export default function AuthAlert({
  variant,
  children,
  title,
  actions,
}: AuthAlertProps) {
  const { container, icon, Icon } = variantStyles[variant]
  const role = variant === 'error' ? 'alert' : 'status'

  return (
    <div
      className={`rounded-control border p-4 ${container}`}
      role={role}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex gap-3">
        <Icon className={`h-5 w-5 shrink-0 ${icon}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          {title && <p className="text-sm font-medium">{title}</p>}
          <div className={`text-sm ${title ? 'mt-1' : ''}`}>{children}</div>
          {actions ? <div className="mt-3">{actions}</div> : null}
        </div>
      </div>
    </div>
  )
}
