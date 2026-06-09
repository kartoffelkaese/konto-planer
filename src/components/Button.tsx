'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'danger-outline'
  | 'ghost'
  | 'accent-subtle'
  | 'warning'

export type ButtonSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-sm px-4 py-3',
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'btn-primary border border-transparent shadow-sm text-accent-foreground focus:ring-accent',
  secondary: 'btn-secondary shadow-sm focus:ring-accent',
  danger:
    'bg-danger text-danger-foreground border border-transparent shadow-sm hover:bg-danger-hover focus:ring-danger',
  'danger-outline':
    'text-expense bg-surface border border-danger shadow-sm hover:bg-danger-subtle focus:ring-danger',
  ghost:
    'bg-transparent text-accent border-transparent hover:text-accent-hover focus:ring-accent',
  'accent-subtle':
    'text-accent bg-accent-subtle border border-transparent hover:opacity-90 focus:ring-accent',
  warning:
    'bg-pending text-pending-foreground border border-transparent shadow-sm hover:opacity-90 focus:ring-pending',
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors duration-[var(--motion-duration-feedback)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50'

function ButtonSpinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

export function getButtonClassName({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className = '',
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
}) {
  return [baseClasses, sizeClasses[size], variantClasses[variant], fullWidth ? 'w-full' : '', className]
    .filter(Boolean)
    .join(' ')
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  loadingText?: string
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingText,
    fullWidth,
    children,
    disabled,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading
  const spinnerOnLight =
    variant === 'secondary' || variant === 'ghost' || variant === 'accent-subtle'
  const spinnerClass = spinnerOnLight ? 'text-accent' : 'text-current'
  const label = loading ? (loadingText ?? children) : children

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={getButtonClassName({ variant, size, fullWidth, className })}
      {...props}
    >
      {loading && <ButtonSpinner className={spinnerClass} />}
      {label}
    </button>
  )
})
