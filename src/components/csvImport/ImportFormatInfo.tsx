import Link from 'next/link'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { ImportFormatMeta } from './importRows'

type ImportFormatInfoProps = {
  formatMeta: ImportFormatMeta
  disabled: boolean
  onFormatChange: (formatId: string) => void
}

export default function ImportFormatInfo({
  formatMeta,
  disabled,
  onFormatChange,
}: ImportFormatInfoProps) {
  return (
    <div className="space-y-2 rounded-card border border-border bg-surface-muted/50 px-3 py-2.5 text-sm">
      <p className="text-primary">
        {formatMeta.bankName ? (
          <>
            Import für{' '}
            <span className="font-medium">{formatMeta.bankName}</span>
            {' – '}
            Format{' '}
            <span className="font-medium">{formatMeta.formatLabel}</span>
          </>
        ) : (
          <>
            Format{' '}
            <span className="font-medium">{formatMeta.formatLabel}</span>
          </>
        )}
      </p>
      {!formatMeta.bankId && (
        <p className="text-secondary text-xs">
          Keine Bank in den Einstellungen gewählt.{' '}
          <Link href="/settings" className="text-accent underline">
            Bank in Einstellungen wählen
          </Link>
        </p>
      )}
      {formatMeta.headerMismatch && (
        <p className="flex items-start gap-1.5 text-pending text-xs">
          <ExclamationTriangleIcon className="h-4 w-4 shrink-0" aria-hidden />
          Die CSV-Spalten passen nicht zum erwarteten Format. Prüfe die
          Bank in den Einstellungen oder wähle ein anderes Format.
        </p>
      )}
      {formatMeta.availableFormats.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <label
            htmlFor="csv-format-override"
            className="text-xs font-medium text-secondary"
          >
            Anderes Format:
          </label>
          <select
            id="csv-format-override"
            value={formatMeta.formatId}
            disabled={disabled}
            onChange={(e) => onFormatChange(e.target.value)}
            className="rounded-control border border-border bg-surface px-2 py-1 text-xs text-primary"
          >
            {formatMeta.availableFormats.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <Link href="/settings" className="text-xs text-accent underline">
            Bank ändern
          </Link>
        </div>
      )}
    </div>
  )
}
