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
  sm: 'text-xs px-3 min-h-11 md:min-h-9',
  md: 'text-sm px-4 min-h-11',
  lg: 'text-base px-5 min-h-12',
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'btn-primary border border-transparent text-accent-foreground focus-visible:ring-accent',
  secondary: 'btn-secondary focus-visible:ring-accent',
  danger:
    'bg-danger text-danger-foreground border border-transparent hover:bg-danger-hover focus-visible:ring-danger',
  'danger-outline':
    'text-danger bg-danger-subtle border border-transparent hover:border-danger focus-visible:ring-danger',
  ghost:
    'bg-transparent text-accent border border-transparent hover:bg-accent-subtle hover:text-accent-hover focus-visible:ring-accent',
  'accent-subtle':
    'text-accent bg-accent-subtle border border-transparent hover:border-accent-border focus-visible:ring-accent',
  warning:
    'bg-pending text-pending-foreground border border-transparent hover:opacity-90 focus-visible:ring-pending',
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-colors duration-[var(--motion-duration-feedback)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50'

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
