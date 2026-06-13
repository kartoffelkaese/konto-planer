import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { getButtonClassName } from '@/components/Button'

type AuthPageLayoutProps = {
  children: ReactNode
  alternateHref: string
  alternateLabel: string
}

export default function AuthPageLayout({
  children,
  alternateHref,
  alternateLabel,
}: AuthPageLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-canvas">
      <div
        className="landing-hero-glow pointer-events-none absolute inset-0 opacity-70"
        aria-hidden="true"
      />

      <header className="relative z-10 border-b border-border/80 bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-secondary transition-colors duration-feedback hover:text-accent"
          >
            <ArrowLeftIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Zur Startseite</span>
            <span className="sm:hidden">Startseite</span>
          </Link>

          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold tracking-tight text-accent"
          >
            KontoPlaner
          </Link>

          <Link
            href={alternateHref}
            className={getButtonClassName({ variant: 'ghost', size: 'sm' })}
          >
            {alternateLabel}
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        {children}
      </div>
    </div>
  )
}

type AuthCardProps = {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-primary">{title}</h1>
        <p className="mt-2 text-sm text-secondary">{subtitle}</p>
      </div>

      <div className="rounded-card border border-border bg-surface p-6 shadow-[0_12px_32px_var(--shadow-color)] sm:p-8">
        {children}
      </div>

      {footer ? <div className="mt-6 text-center">{footer}</div> : null}
    </div>
  )
}

export function AuthAlternateLink({
  prompt,
  href,
  label,
}: {
  prompt: string
  href: string
  label: string
}) {
  return (
    <p className="text-sm text-secondary">
      {prompt}{' '}
      <Link
        href={href}
        className="font-medium text-accent transition-colors duration-feedback hover:text-accent-hover"
      >
        {label}
      </Link>
    </p>
  )
}
