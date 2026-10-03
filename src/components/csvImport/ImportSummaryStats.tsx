import { formatDate } from '@/lib/dateUtils'
import type { ImportSummary } from './importRows'

function StatCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number
  tone?: 'neutral' | 'accent' | 'warning' | 'danger'
}) {
  const toneClass = {
    neutral: 'bg-surface-muted text-primary',
    accent: 'bg-accent-subtle text-accent',
    warning: 'bg-pending-bg text-pending',
    danger: 'bg-danger-subtle text-danger',
  }[tone]

  return (
    <div className={`rounded-control border border-border px-3 py-2 ${toneClass}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

type ImportSummaryStatsProps = {
  stats: ImportSummary
  selectedImportCount: number
  selectedConfirmCount: number
}

export default function ImportSummaryStats({
  stats,
  selectedImportCount,
  selectedConfirmCount,
}: ImportSummaryStatsProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <StatCard label="Zeilen gesamt" value={stats.total} />
        <StatCard label="Zum Import" value={selectedImportCount} tone="accent" />
        <StatCard
          label="Bestätigen"
          value={selectedConfirmCount}
          tone={stats.confirmable > 0 ? 'accent' : 'neutral'}
        />
        <StatCard
          label="Wiederkehrend"
          value={stats.recurring ?? 0}
          tone={(stats.recurring ?? 0) > 0 ? 'warning' : 'neutral'}
        />
        <StatCard label="Duplikate" value={stats.duplicates} tone="warning" />
        <StatCard
          label="Mit Fehlern"
          value={stats.errors}
          tone={stats.errors > 0 ? 'danger' : 'neutral'}
        />
      </div>
      {stats.dateRange && (
        <p className="text-sm text-secondary">
          Importzeitraum:{' '}
          <span className="font-medium text-primary">
            {formatDate(stats.dateRange.start)}
            {stats.dateRange.start !== stats.dateRange.end &&
              ` – ${formatDate(stats.dateRange.end)}`}
          </span>
          <span className="text-xs text-secondary ml-1">
            (Duplikatprüfung nur in diesem Zeitraum)
          </span>
        </p>
      )}
    </div>
  )
}
