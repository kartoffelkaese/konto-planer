'use client'

import { useState } from 'react'
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/Modal'
import { Button } from '@/components/Button'
import { useUserSettings } from '@/hooks/useUserSettings'
import { isCsvImportAvailableForBank } from '@/lib/csvImport/bankFormats'
import ImportFormatInfo from '@/components/csvImport/ImportFormatInfo'
import ImportPreviewRowCard from '@/components/csvImport/ImportPreviewRowCard'
import ImportSummaryStats from '@/components/csvImport/ImportSummaryStats'
import { useCsvImport } from '@/components/csvImport/useCsvImport'
import RecurringDetectionDialog from '@/components/recurring/RecurringDetectionDialog'

type TransactionCsvImportProps = {
  onImported: () => void
}

export default function TransactionCsvImport({ onImported }: TransactionCsvImportProps) {
  const { settings, loading: settingsLoading, accountEntitlements } = useUserSettings()
  const csvImportAvailable = isCsvImportAvailableForBank(settings?.bankId)
  const {
    fileInputRef,
    open,
    loading,
    committing,
    merchants,
    rows,
    stats,
    formatMeta,
    recurringSuggestionCount,
    getCsvText,
    selectedImportCount,
    selectedConfirmCount,
    selectedCount,
    validCount,
    handleClose,
    handleFileChange,
    handleFormatOverride,
    handleMerchantChange,
    handleCommit,
    updateRow,
    selectAll,
    selectNone,
    selectWithoutDuplicates,
  } = useCsvImport(onImported)
  // Datei für den Assistenten „Aus Kontoauszug erkennen“, wenn er aus dem Import geöffnet wird
  const [detection, setDetection] = useState<{ csvText: string; formatId?: string } | null>(null)

  const openDetection = () => {
    setDetection({ csvText: getCsvText(), formatId: formatMeta?.formatId })
    handleClose()
  }

  if (settingsLoading || !csvImportAvailable || !accountEntitlements.csvImport) {
    return null
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
        <ArrowUpTrayIcon className="h-5 w-5 shrink-0" aria-hidden />
        CSV importieren
      </Button>

      <Modal
        isOpen={open}
        onClose={handleClose}
        title="CSV-Import prüfen"
        maxWidth="6xl"
      >
        <div className="flex flex-col gap-4 -mx-1">
          {formatMeta && (
            <ImportFormatInfo
              formatMeta={formatMeta}
              disabled={loading}
              onFormatChange={handleFormatOverride}
            />
          )}

          {recurringSuggestionCount > 0 && !settings?.isSimpleAccount && (
            <div className="flex flex-col gap-2 rounded-control bg-accent-subtle p-3 text-sm text-primary sm:flex-row sm:items-center">
              <p className="flex-1">
                {recurringSuggestionCount === 1
                  ? 'In dieser Datei steckt eine mögliche wiederkehrende Zahlung, die noch nicht angelegt ist.'
                  : `In dieser Datei stecken ${recurringSuggestionCount} mögliche wiederkehrende Zahlungen, die noch nicht angelegt sind.`}
                <span className="block text-xs text-secondary">
                  Der Import wird dabei abgebrochen; du kannst ihn danach erneut starten.
                </span>
              </p>
              <Button type="button" variant="secondary" size="sm" onClick={openDetection}>
                Vorschläge ansehen
              </Button>
            </div>
          )}

          {stats && (
            <ImportSummaryStats
              stats={stats}
              selectedImportCount={selectedImportCount}
              selectedConfirmCount={selectedConfirmCount}
            />
          )}

          <div className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface-muted/50 p-3">
            <span className="text-xs font-medium text-secondary mr-1">Auswahl:</span>
            <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
              Alle
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={selectNone}>
              Keine
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={selectWithoutDuplicates}>
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
                ? [
                    selectedImportCount > 0
                      ? `${selectedImportCount} importieren`
                      : null,
                    selectedConfirmCount > 0
                      ? `${selectedConfirmCount} bestätigen`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(', ')
                : 'Übernehmen'}
            </Button>
          </div>
        </div>
      </Modal>

      <RecurringDetectionDialog
        isOpen={detection !== null}
        onClose={() => setDetection(null)}
        onCreated={onImported}
        initialCsvText={detection?.csvText}
        initialFormatId={detection?.formatId}
      />
    </>
  )
}
