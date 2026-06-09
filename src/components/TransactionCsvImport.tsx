'use client'

import { useRef, useState, useMemo, useCallback } from 'react'
import {
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline'
import Modal from '@/components/Modal'
import { Button } from '@/components/Button'
import { useToast } from '@/hooks/useToast'
import {
  previewCsvImport,
  commitCsvImport,
  type CsvImportPreviewMerchant,
  type CsvImportPreviewRow,
} from '@/lib/api'
import { suggestCategoryIdForMerchant } from '@/lib/suggestCategoryId'
import { formatCurrency } from '@/lib/formatters'

type EditableImportRow = CsvImportPreviewRow & {
  included: boolean
  createNewMerchant: boolean
}

type ImportSummary = {
  total: number
  duplicates: number
  errors: number
  suggested: number
}

type TransactionCsvImportProps = {
  onImported: () => void
}

const NEW_MERCHANT_VALUE = '__new__'

function matchHint(confidence: CsvImportPreviewRow['matchConfidence']): string | null {
  switch (confidence) {
    case 'exact':
      return 'Händler exakt erkannt'
    case 'contains':
      return 'Händler im Text erkannt'
    case 'similar':
      return 'Ähnlicher Händler vorgeschlagen'
    default:
      return null
  }
}

function rowIsValid(row: EditableImportRow): boolean {
  return (
    row.errors.length === 0 &&
    !!row.date &&
    row.amount !== null &&
    (!!row.merchantId || (row.createNewMerchant && !!row.merchantName?.trim()))
  )
}

function toEditableRows(rows: CsvImportPreviewRow[]): EditableImportRow[] {
  return rows.map((row) => ({
    ...row,
    included: row.suggestedIncluded,
    createNewMerchant: !row.merchantId && row.errors.length === 0,
    merchantName: row.merchantName ?? row.merchantRaw,
  }))
}

function rowBorderClass(row: EditableImportRow, valid: boolean): string {
  if (row.errors.length > 0) return 'border-l-danger'
  if (row.isDuplicate) return 'border-l-pending'
  if (row.included && valid) return 'border-l-income'
  return 'border-l-border'
}

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

function ImportPreviewRowCard({
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
  const amountClass =
    row.amount !== null && row.amount >= 0 ? 'text-income' : 'text-expense'

  return (
    <article
      className={`rounded-card border border-border border-l-4 bg-surface p-4 shadow-sm transition-colors ${rowBorderClass(row, valid)} ${
        row.included && valid ? 'ring-1 ring-accent/15' : ''
      }`}
    >
      <div className="flex gap-3">
        <div className="pt-1">
          <input
            type="checkbox"
            checked={row.included}
            disabled={!valid}
            onChange={(e) => onUpdate({ included: e.target.checked })}
            className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
            aria-label={`Zeile ${row.rowIndex} importieren`}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={row.date ?? ''}
                disabled={row.errors.length > 0 && !row.date}
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
              {row.isDuplicate && (
                <span className="inline-flex items-center gap-1 rounded-full border border-pending/40 bg-pending-bg px-2 py-0.5 text-xs font-medium text-pending">
                  <DocumentDuplicateIcon className="h-3.5 w-3.5" aria-hidden />
                  Duplikat
                </span>
              )}
            </div>
          </div>

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

          {row.amount !== null && (
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
      </div>
    </article>
  )
}

export default function TransactionCsvImport({ onImported }: TransactionCsvImportProps) {
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [merchants, setMerchants] = useState<CsvImportPreviewMerchant[]>([])
  const [rows, setRows] = useState<EditableImportRow[]>([])
  const [stats, setStats] = useState<ImportSummary | null>(null)

  const resetImportState = useCallback(() => {
    setRows([])
    setMerchants([])
    setStats(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleClose = () => {
    setOpen(false)
    resetImportState()
  }

  const selectedCount = useMemo(
    () => rows.filter((r) => r.included && rowIsValid(r)).length,
    [rows]
  )

  const validCount = useMemo(() => rows.filter((r) => rowIsValid(r)).length, [rows])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)

    try {
      const csvText = await file.text()
      const preview = await previewCsvImport(csvText)
      setMerchants(preview.merchants)
      setRows(toEditableRows(preview.rows))
      setStats(preview.summary)
      setOpen(true)
    } catch (err) {
      console.error(err)
      showToast(
        err instanceof Error ? err.message : 'CSV konnte nicht gelesen werden',
        'error'
      )
      resetImportState()
    } finally {
      setLoading(false)
    }
  }

  const updateRow = (rowIndex: number, patch: Partial<EditableImportRow>) => {
    setRows((prev) =>
      prev.map((row) => (row.rowIndex === rowIndex ? { ...row, ...patch } : row))
    )
  }

  const handleMerchantChange = (rowIndex: number, value: string) => {
    const row = rows.find((r) => r.rowIndex === rowIndex)
    if (!row) return

    if (value === NEW_MERCHANT_VALUE) {
      updateRow(rowIndex, {
        merchantId: null,
        createNewMerchant: true,
        merchantName: row.merchantRaw,
        categoryId: '',
      })
      return
    }

    const merchant = merchants.find((m) => m.id === value)
    updateRow(rowIndex, {
      merchantId: value,
      createNewMerchant: false,
      merchantName: merchant?.name ?? row.merchantName,
      categoryId: suggestCategoryIdForMerchant(merchant ?? null),
      matchConfidence: 'exact',
    })
  }

  const handleCommit = async () => {
    const toImport = rows.filter((r) => r.included && rowIsValid(r))
    if (toImport.length === 0) return

    setCommitting(true)
    try {
      const result = await commitCsvImport(
        toImport.map((row) => ({
          rowIndex: row.rowIndex,
          date: row.date!,
          amount: row.amount!,
          description: row.description || null,
          merchantId: row.createNewMerchant ? null : row.merchantId,
          merchant: row.createNewMerchant
            ? row.merchantName?.trim() || row.merchantRaw
            : row.merchantId
              ? undefined
              : row.merchantName?.trim() || row.merchantRaw,
          createNewMerchant: row.createNewMerchant,
          categoryId: row.categoryId || null,
          isConfirmed: row.isConfirmed,
        }))
      )

      if (result.created > 0) {
        showToast(
          `${result.created} Transaktion${result.created === 1 ? '' : 'en'} importiert`,
          'success'
        )
        handleClose()
        onImported()
      } else {
        showToast('Keine Transaktionen importiert', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast(
        err instanceof Error ? err.message : 'Import fehlgeschlagen',
        'error'
      )
    } finally {
      setCommitting(false)
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="secondary"
        className="shrink-0"
        loading={loading}
        loadingText="Wird gelesen…"
        onClick={() => fileInputRef.current?.click()}
      >
        <ArrowUpTrayIcon className="h-4 w-4 shrink-0" aria-hidden />
        CSV importieren
      </Button>

      <Modal
        isOpen={open}
        onClose={handleClose}
        title="CSV-Import prüfen"
        maxWidth="6xl"
      >
        <div className="flex flex-col gap-4 -mx-1">
          {stats && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatCard label="Zeilen gesamt" value={stats.total} />
              <StatCard label="Zum Import" value={selectedCount} tone="accent" />
              <StatCard label="Duplikate" value={stats.duplicates} tone="warning" />
              <StatCard
                label="Mit Fehlern"
                value={stats.errors}
                tone={stats.errors > 0 ? 'danger' : 'neutral'}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface-muted/50 p-3">
            <span className="text-xs font-medium text-secondary mr-1">Auswahl:</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setRows((prev) =>
                  prev.map((r) => (rowIsValid(r) ? { ...r, included: true } : r))
                )
              }
            >
              Alle
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setRows((prev) => prev.map((r) => ({ ...r, included: false })))
              }
            >
              Keine
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setRows((prev) =>
                  prev.map((r) =>
                    rowIsValid(r) && !r.isDuplicate
                      ? { ...r, included: true }
                      : { ...r, included: false }
                  )
                )
              }
            >
              Ohne Duplikate
            </Button>
            <p className="ml-auto text-sm text-primary">
              <span className="font-semibold tabular-nums">{selectedCount}</span>
              <span className="text-secondary"> / {validCount} gültig</span>
            </p>
          </div>

          <div className="max-h-[min(58vh,28rem)] space-y-3 overflow-y-auto pr-1">
            {rows.map((row) => (
              <ImportPreviewRowCard
                key={row.rowIndex}
                row={row}
                merchants={merchants}
                onUpdate={(patch) => updateRow(row.rowIndex, patch)}
                onMerchantChange={(value) => handleMerchantChange(row.rowIndex, value)}
              />
            ))}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleCommit}
              loading={committing}
              loadingText="Importiere…"
              disabled={selectedCount === 0}
            >
              {selectedCount > 0
                ? `${selectedCount} Buchung${selectedCount === 1 ? '' : 'en'} übernehmen`
                : 'Übernehmen'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
