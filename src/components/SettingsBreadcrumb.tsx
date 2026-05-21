import Link from 'next/link'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'

interface SettingsBreadcrumbProps {
  current: string
}

export default function SettingsBreadcrumb({ current }: SettingsBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
      >
        <ChevronLeftIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        Einstellungen
      </Link>
      <span className="mx-2 text-secondary" aria-hidden="true">
        /
      </span>
      <span className="text-sm font-medium text-primary">{current}</span>
    </nav>
  )
}
