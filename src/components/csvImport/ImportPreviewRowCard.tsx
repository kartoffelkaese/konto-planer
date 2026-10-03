import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline'
import type { CsvImportPreviewMerchant } from '@/lib/api'
import { formatCurrency } from '@/lib/formatters'
import {
  NEW_MERCHANT_VALUE,
  matchHint,
  recurringConfirmDescription,
  recurringConfirmTitle,
  recurringMatchLabel,
  rowBorderClass,
  rowCanConfirm,
  rowIsValid,
  type EditableImportRow,
} from './importRows'

export default function ImportPreviewRowCard({
  row,
  merchants,
  onUpdate,
  onMerchantChange,
}: {
  row: EditableImportRow
  merchants: CsvImportPreviewMerchant[]
  onUpdate: (patch: Partial<EditableImportRow>) => void
  onMerchantChange: (value: string) => void
}) {
  const valid = rowIsValid(row)
  const confirmable = rowCanConfirm(row)
  const amountClass =
    row.amount !== null && row.amount >= 0 ? 'text-income' : 'text-expense'
  const isSelected =
    (row.included && valid && !confirmable && !row.isRecurringMatch) ||
    (row.confirmIncluded && confirmable)

  return (
    <article
      className={`rounded-card border border-border border-l-4 bg-surface p-4 shadow-sm transition-colors ${rowBorderClass(row, valid)} ${
        isSelected ? 'ring-1 ring-accent/15' : ''
      }`}
    >
      <div className="flex gap-3">
        <div className="pt-1 space-y-2">
          {!confirmable ? (
            <input
              type="checkbox"
              checked={row.included}
              disabled={!valid || row.isRecurringMatch}
              onChange={(e) => onUpdate({ included: e.target.checked })}
              className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
              aria-label={`Zeile ${row.rowIndex} importieren`}
            />
          ) : (
            <input
              type="checkbox"
              checked={row.confirmIncluded}
              onChange={(e) => onUpdate({ confirmIncluded: e.target.checked })}
              className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
              aria-label={`Zeile ${row.rowIndex} – ${recurringConfirmTitle(row)}`}
              title={recurringConfirmTitle(row)}
            />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={row.date ?? ''}
                disabled={confirmable || (row.errors.length > 0 && !row.date)}
                onChange={(e) => onUpdate({ date: e.target.value })}
                className="text-sm font-medium"
              />
              {row.amount !== null && (
                <span className={`text-sm font-semibold tabular-nums ${amountClass}`}>
                  {formatCurrency(row.amount)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {row.isConfirmed ? (
                <span className="inline-flex items-center rounded-full border border-income/30 bg-income-bg px-2 py-0.5 text-xs font-medium text-income">
                  Gebucht
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-pending/40 bg-pending-bg px-2 py-0.5 text-xs font-medium text-pending">
                  Offen
                </span>
              )}
              {row.isRecurringMatch && (
                <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
                  <ArrowPathIcon className="h-3.5 w-3.5" aria-hidden />
                  {recurringMatchLabel(row)}
                </span>
              )}
              {row.isDuplicate && !row.isRecurringMatch && (
                <span className="inline-flex items-center gap-1 rounded-full border border-pending/40 bg-pending-bg px-2 py-0.5 text-xs font-medium text-pending">
                  <DocumentDuplicateIcon className="h-3.5 w-3.5" aria-hidden />
                  {confirmable
                    ? 'Duplikat – offen, kann bestätigt werden'
                    : 'Duplikat'}
                </span>
              )}
            </div>
          </div>

          {confirmable ? (
            <div className="rounded-control border border-accent/20 bg-accent-subtle/30 px-3 py-2 text-sm text-primary">
              <p className="font-medium">
                {row.canConfirmRecurring
                  ? recurringConfirmTitle(row)
                  : 'Bestehende Buchung bestätigen'}
              </p>
              <p className="mt-1 text-xs text-secondary">
                {row.canConfirmRecurring
                  ? recurringConfirmDescription(row)
                  : 'Es wird keine neue Transaktion angelegt – die offene Buchung wird als gebucht markiert.'}
              </p>
            </div>
          ) : row.isRecurringMatch ? (
            <div className="rounded-control border border-border bg-surface-muted/80 px-3 py-2 text-sm text-secondary">
              {row.recurringMatchKind === 'alreadyBooked'
                ? 'Diese wiederkehrende Buchung ist im Gehaltsmonat bereits gebucht – kein Import nötig.'
                : 'Wiederkehrende Zahlung – normaler Import ist nicht möglich.'}
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-secondary">
                    Händler
                  </label>
                  <select
                    value={
                      row.createNewMerchant ? NEW_MERCHANT_VALUE : row.merchantId ?? ''
                    }
                    onChange={(e) => onMerchantChange(e.target.value)}
                    className="w-full text-sm"
                  >
                    <option value="">— Händler wählen —</option>
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                    <option value={NEW_MERCHANT_VALUE}>
                      Neu anlegen: {row.merchantRaw}
                    </option>
                  </select>
                  {row.createNewMerchant && (
                    <input
                      type="text"
                      value={row.merchantName ?? ''}
                      onChange={(e) => onUpdate({ merchantName: e.target.value })}
                      className="w-full text-sm"
                      placeholder="Name für neuen Händler"
                    />
                  )}
                  {matchHint(row.matchConfidence) ? (
                    <p className="text-xs text-accent">{matchHint(row.matchConfidence)}</p>
                  ) : (
                    !row.merchantId &&
                    !row.createNewMerchant && (
                      <p className="text-xs text-secondary">Händler bitte zuweisen</p>
                    )
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-secondary">
                    Verwendungszweck
                  </label>
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) => onUpdate({ description: e.target.value })}
                    className="w-full text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="rounded-control bg-surface-muted/80 px-3 py-2 text-xs text-secondary">
                  <span className="font-medium text-primary">Aus CSV: </span>
                  <span title={row.merchantRaw}>{row.merchantRaw}</span>
                  {row.description && row.description !== row.merchantRaw && (
                    <>
                      <span className="mx-1 opacity-50">·</span>
                      <span title={row.description}>{row.description}</span>
                    </>
                  )}
                </div>

                <label className="flex items-center gap-2 text-sm text-primary sm:justify-end">
                  <input
                    type="checkbox"
                    checked={row.isConfirmed}
                    onChange={(e) => onUpdate({ isConfirmed: e.target.checked })}
                    className="rounded border-border text-accent focus:ring-accent"
                  />
                  Als gebucht markieren
                </label>
              </div>
            </>
          )}

          {confirmable && (
            <div className="rounded-control bg-surface-muted/80 px-3 py-2 text-xs text-secondary">
              <span className="font-medium text-primary">Aus CSV: </span>
              <span title={row.merchantRaw}>{row.merchantRaw}</span>
              {row.description && row.description !== row.merchantRaw && (
                <>
                  <span className="mx-1 opacity-50">·</span>
                  <span title={row.description}>{row.description}</span>
                </>
              )}
            </div>
          )}

          {row.errors.length > 0 && (
            <div
              className="flex items-start gap-2 rounded-control border border-danger/25 bg-danger-subtle/50 px-3 py-2 text-xs text-danger"
              role="alert"
            >
              <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
              <ul className="space-y-0.5">
                {row.errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {row.amount !== null && !confirmable && (
            <details className="text-xs text-secondary sm:hidden">
              <summary className="cursor-pointer hover:text-primary">Betrag anpassen</summary>
              <input
                type="number"
                step="0.01"
                value={row.amount}
                onChange={(e) =>
                  onUpdate({
                    amount: e.target.value
                      ? Number.parseFloat(e.target.value)
                      : null,
                  })
                }
                className="mt-2 w-full text-sm"
              />
            </details>
          )}
        </div>

        {!confirmable && (
          <div className="hidden sm:block w-28 shrink-0">
            <label className="block text-xs font-medium text-secondary mb-1.5 text-right">
              Betrag (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={row.amount ?? ''}
              onChange={(e) =>
                onUpdate({
                  amount: e.target.value ? Number.parseFloat(e.target.value) : null,
                })
              }
              className="w-full text-sm text-right tabular-nums"
            />
          </div>
        )}
      </div>
    </article>
  )
}
