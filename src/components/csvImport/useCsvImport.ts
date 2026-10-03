import { useRef, useState, useMemo, useCallback } from 'react'
import { useToast } from '@/hooks/useToast'
import {
  previewCsvImport,
  commitCsvImport,
  type CsvImportPreviewMerchant,
} from '@/lib/api'
import { suggestCategoryIdForMerchant } from '@/lib/suggestCategoryId'
import {
  NEW_MERCHANT_VALUE,
  buildCommitRows,
  rowCanConfirm,
  rowIsValid,
  rowsToConfirm,
  rowsToImport,
  toEditableRows,
  type EditableImportRow,
  type ImportFormatMeta,
  type ImportSummary,
} from './importRows'

/** Zustand und Abläufe des CSV-Imports: Datei lesen, Vorschau bearbeiten, übernehmen. */
export function useCsvImport(onImported: () => void) {
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const csvTextRef = useRef<string>('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [merchants, setMerchants] = useState<CsvImportPreviewMerchant[]>([])
  const [rows, setRows] = useState<EditableImportRow[]>([])
  const [stats, setStats] = useState<ImportSummary | null>(null)
  const [formatMeta, setFormatMeta] = useState<ImportFormatMeta | null>(null)

  const resetImportState = useCallback(() => {
    setRows([])
    setMerchants([])
    setStats(null)
    setFormatMeta(null)
    csvTextRef.current = ''
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const applyPreview = useCallback(
    (preview: Awaited<ReturnType<typeof previewCsvImport>>) => {
      setMerchants(preview.merchants)
      setRows(toEditableRows(preview.rows))
      setStats(preview.summary)
      setFormatMeta({
        formatId: preview.formatId,
        formatLabel: preview.formatLabel,
        bankId: preview.bankId,
        bankName: preview.bankName,
        headerMismatch: preview.headerMismatch,
        availableFormats: preview.availableFormats,
      })
    },
    []
  )

  const loadPreview = useCallback(
    async (csvText: string, formatId?: string) => {
      const preview = await previewCsvImport(csvText, formatId ? { formatId } : undefined)
      applyPreview(preview)
      return preview
    },
    [applyPreview]
  )

  const handleClose = () => {
    setOpen(false)
    resetImportState()
  }

  const selectedImportCount = useMemo(() => rowsToImport(rows).length, [rows])

  const selectedConfirmCount = useMemo(() => rowsToConfirm(rows).length, [rows])

  const selectedCount = selectedImportCount + selectedConfirmCount

  const validCount = useMemo(
    () =>
      rows.filter((r) => rowIsValid(r) || rowCanConfirm(r)).length,
    [rows]
  )

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)

    try {
      const csvText = await file.text()
      csvTextRef.current = csvText
      await loadPreview(csvText)
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

  const handleFormatOverride = async (formatId: string) => {
    if (!csvTextRef.current) return
    setLoading(true)
    try {
      await loadPreview(csvTextRef.current, formatId)
    } catch (err) {
      console.error(err)
      showToast(
        err instanceof Error ? err.message : 'CSV konnte nicht neu gelesen werden',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  const selectAll = () => {
    setRows((prev) =>
      prev.map((r) => {
        if (rowCanConfirm(r)) {
          return { ...r, confirmIncluded: true }
        }
        if (rowIsValid(r)) {
          return { ...r, included: true }
        }
        return r
      })
    )
  }

  const selectNone = () => {
    setRows((prev) =>
      prev.map((r) => ({ ...r, included: false, confirmIncluded: false }))
    )
  }

  const selectWithoutDuplicates = () => {
    setRows((prev) =>
      prev.map((r) =>
        rowIsValid(r) && !r.isDuplicate && !r.isRecurringMatch
          ? { ...r, included: true }
          : { ...r, included: false }
      )
    )
  }

  const handleCommit = async () => {
    const toImport = rowsToImport(rows)
    const toConfirm = rowsToConfirm(rows)
    if (toImport.length === 0 && toConfirm.length === 0) return

    setCommitting(true)
    try {
      const result = await commitCsvImport(buildCommitRows(toConfirm, toImport))

      const parts: string[] = []
      if (result.created > 0) {
        parts.push(
          `${result.created} importiert`
        )
      }
      if (result.confirmed > 0) {
        parts.push(
          `${result.confirmed} bestätigt`
        )
      }

      if (parts.length > 0) {
        showToast(parts.join(', '), 'success')
        handleClose()
        onImported()
      } else {
        showToast('Keine Transaktionen übernommen', 'error')
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

  return {
    fileInputRef,
    open,
    loading,
    committing,
    merchants,
    rows,
    stats,
    formatMeta,
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
  }
}
