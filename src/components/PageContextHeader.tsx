import type { ReactNode } from 'react'

type PageContextHeaderProps = {
  title: string
  subtitle?: string
  accountName?: string | null
  actions?: ReactNode
}

export default function PageContextHeader({
  title,
  subtitle,
  accountName,
  actions,
}: PageContextHeaderProps) {
  const contextLine =
    subtitle ?? (accountName ? `Konto: ${accountName}` : undefined)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {contextLine && (
          <p className="mt-1 text-sm text-secondary">{contextLine}</p>
        )}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      ) : null}
    </div>
  )
}
