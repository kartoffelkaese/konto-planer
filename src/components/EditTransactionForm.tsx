'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getTransaction, updateTransaction, deleteTransaction } from '@/lib/api'
import { formatDateForInput } from '@/lib/dateUtils'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/Button'
import LoadingSpinner from '@/components/LoadingSpinner'
import ConfirmDialog from '@/components/ConfirmDialog'
import TransferAccountFields, { type TransferTarget } from '@/components/TransferAccountFields'
import CategorySelect from '@/components/CategorySelect'
import { resolveMerchantCategories, resolveTransactionCategory } from '@/lib/merchantCategories'

interface Merchant {
  id: string
  name: string
  categoryIds?: string[]
  categories?: Array<{ id: string; name: string }>
}

interface EditTransactionFormProps {
  id: string
  onSuccess?: () => void
  onCancel?: () => void
  hideRecurring?: boolean
}

export default function EditTransactionForm({
  id,
  onSuccess,
  onCancel,
  hideRecurring = false,
}: EditTransactionFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isRecurringTemplate, setIsRecurringTemplate] = useState(false)
  const [transferTargets, setTransferTargets] = useState<TransferTarget[]>([])
  const [isTransfer, setIsTransfer] = useState(false)
  const [transferTargetAccountId, setTransferTargetAccountId] = useState('')
  const [linkedTargetName, setLinkedTargetName] = useState<string | null>(null)
  const [hasActivePair, setHasActivePair] = useState(false)
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [categoryTouched, setCategoryTouched] = useState(false)
  const [resolvedSuggestion, setResolvedSuggestion] = useState<string | null>(null)
  const [storedCategoryId, setStoredCategoryId] = useState<string | null>(null)
  const [suggestedCategoryIds, setSuggestedCategoryIds] = useState<string[]>([])
  const [formData, setFormData] = useState({
    merchant: '',
    description: '',
    amount: '',
    type: 'expense',
    date: formatDateForInput(new Date()),
    isRecurring: false,
    isRecurringPaused: false,
    recurringInterval: 'monthly',
    isConfirmed: false
  })

  useEffect(() => {
    loadTransaction()
    loadTransferTargets()
    loadMerchants()
  }, [id])

  const loadMerchants = async () => {
    try {
      const response = await fetch('/api/merchants')
      if (!response.ok) return
      setMerchants(await response.json())
    } catch (err) {
      console.error('Error loading merchants:', err)
    }
  }

  const loadTransferTargets = async () => {
    try {
      const response = await fetch('/api/accounts/transfer-targets')
      if (!response.ok) return
      const data = await response.json()
      setTransferTargets(data)
    } catch (err) {
      console.error('Error loading transfer targets:', err)
    }
  }

  const loadTransaction = async () => {
    try {
      const transaction = await getTransaction(id)
      const isTemplate =
        transaction.isRecurring && !transaction.parentTransactionId
      setIsRecurringTemplate(isTemplate)
      setIsTransfer(Boolean(transaction.isTransfer))
      setTransferTargetAccountId(transaction.transferTargetAccountId || '')
      setLinkedTargetName(transaction.transferTargetAccount?.name ?? null)
      setHasActivePair(Boolean(transaction.transferPairAsSource?.targetTransactionId))
      const savedCategoryId = transaction.categoryId ?? null
      setStoredCategoryId(savedCategoryId)
      setCategoryId(savedCategoryId ?? '')
      setCategoryTouched(false)
      const resolved = savedCategoryId
        ? null
        : resolveTransactionCategory(transaction)?.id ?? null
      setResolvedSuggestion(resolved)
      setSuggestedCategoryIds(
        resolveMerchantCategories(transaction.merchantRef).map((category) => category.id)
      )
      setFormData({
        merchant: transaction.merchant || '',
        description: transaction.description || '',
        amount: Math.abs(transaction.amount).toString(),
        type: transaction.amount >= 0 ? 'income' : 'expense',
        date: formatDateForInput(transaction.date),
        isRecurring: transaction.isRecurring,
        isRecurringPaused: Boolean(transaction.isRecurringPaused),
        recurringInterval: transaction.recurringInterval || 'monthly',
        isConfirmed: transaction.isConfirmed
      })
      setLoadError(null)
    } catch (err) {
      console.error('Error loading transaction:', err)
      setLoadError('Fehler beim Laden der Transaktion')
    } finally {
      setIsInitialLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await deleteTransaction(id)
      showToast('Transaktion gelöscht', 'success')
      onSuccess?.()
      router.refresh()
    } catch (err) {
      console.error('Error deleting transaction:', err)
      setSubmitError('Fehler beim Löschen der Transaktion')
      showToast('Fehler beim Löschen der Transaktion', 'error')
      setIsSubmitting(false)
    }
  }

  const handleUnlinkTransfer = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await updateTransaction(id, {
        isTransfer: false,
        transferTargetAccountId: undefined,
      })
      setIsTransfer(false)
      setTransferTargetAccountId('')
      setLinkedTargetName(null)
      setHasActivePair(false)
      showToast('Umbuchung getrennt', 'success')
      router.refresh()
    } catch (err) {
      console.error('Error unlinking transfer:', err)
      setSubmitError('Fehler beim Trennen der Umbuchung')
      showToast('Fehler beim Trennen der Umbuchung', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      if (isTransfer && !transferTargetAccountId) {
        setSubmitError('Bitte wählen Sie ein Zielkonto für die Umbuchung.')
        setIsSubmitting(false)
        return
      }

      const amount = isTransfer
        ? -Math.abs(parseFloat(formData.amount))
        : formData.type === 'income'
          ? Math.abs(parseFloat(formData.amount))
          : -Math.abs(parseFloat(formData.amount))

      await updateTransaction(id, {
        merchant: formData.merchant,
        description: formData.description,
        amount,
        date: new Date(formData.date).toISOString(),
        isRecurring: formData.isRecurring,
        isRecurringPaused:
          isRecurringTemplate && formData.isRecurring
            ? formData.isRecurringPaused
            : false,
        recurringInterval: formData.isRecurring ? formData.recurringInterval : undefined,
        isTransfer,
        transferTargetAccountId: isTransfer ? transferTargetAccountId : undefined,
        ...(categoryTouched
          ? { categoryId: categoryId || null }
          : {}),
      })
      showToast('Transaktion gespeichert', 'success')
      onSuccess?.()
      router.refresh()
    } catch (err) {
      console.error('Error updating transaction:', err)
      setSubmitError('Fehler beim Aktualisieren der Transaktion')
      showToast('Fehler beim Aktualisieren der Transaktion', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isInitialLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-4 flex items-center justify-center text-danger">
        {loadError}
      </div>
    )
  }

  return (
    <>
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Transaktion löschen"
        message="Möchten Sie diese Transaktion wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmText="Löschen"
        confirmLoadingText="Wird gelöscht…"
        cancelText="Abbrechen"
        type="danger"
        loading={isSubmitting}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {submitError && (
          <div className="rounded-control bg-danger-subtle p-4">
            <p className="text-sm font-medium text-danger">{submitError}</p>
          </div>
        )}

        <div>
          <label htmlFor="merchant" className="block text-sm font-medium text-primary">
            Händler
          </label>
          <input
            type="text"
            id="merchant"
            list={merchants.length > 0 ? 'edit-merchant-suggestions' : undefined}
            value={formData.merchant}
            onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
            className="mt-1 block w-full rounded-control border-border bg-surface shadow-sm focus:ring-accent"
            placeholder="z.B. Amazon, Lidl, etc."
            required
            disabled={isSubmitting}
            autoFocus
          />
          {merchants.length > 0 && (
            <datalist id="edit-merchant-suggestions">
              {[...merchants]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((merchant) => (
                  <option key={merchant.id} value={merchant.name} />
                ))}
            </datalist>
          )}
        </div>

        <CategorySelect
          id="edit-categoryId"
          value={
            categoryTouched
              ? categoryId
              : categoryId || resolvedSuggestion || ''
          }
          onChange={(nextCategoryId) => {
            setCategoryTouched(true)
            setCategoryId(nextCategoryId)
          }}
          suggestedCategoryIds={suggestedCategoryIds}
          disabled={isSubmitting}
          isSuggestion={!storedCategoryId && !categoryTouched && Boolean(resolvedSuggestion)}
        />

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-primary">
            Beschreibung
          </label>
          <input
            type="text"
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-1 block w-full rounded-control border-border bg-surface shadow-sm focus:ring-accent"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-primary">
              Betrag (€)
            </label>
            <input
              type="number"
              id="amount"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="mt-1 block w-full rounded-control border-border bg-surface shadow-sm focus:ring-accent"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-primary">
              Typ
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="mt-1 block w-full rounded-control border-border bg-surface shadow-sm focus:ring-accent"
              disabled={isSubmitting || isTransfer}
            >
              <option value="expense">Ausgabe</option>
              <option value="income">Einnahme</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-primary">
            Datum
          </label>
          <input
            type="date"
            id="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="mt-1 block w-full rounded-control border-border bg-surface shadow-sm focus:ring-accent"
            required
            disabled={isSubmitting}
          />
        </div>

        {!hideRecurring && (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isRecurring"
            checked={formData.isRecurring}
            onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
            className="h-4 w-4 text-accent focus:ring-accent border-border bg-surface rounded"
            disabled={isSubmitting}
          />
          <label htmlFor="isRecurring" className="ml-2 block text-sm text-primary">
            Wiederkehrende Zahlung
          </label>
        </div>
        )}

        {!hideRecurring && isRecurringTemplate && formData.isRecurring && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isRecurringPaused"
              checked={formData.isRecurringPaused}
              onChange={(e) =>
                setFormData({ ...formData, isRecurringPaused: e.target.checked })
              }
              className="h-4 w-4 text-accent focus:ring-accent border-border bg-surface rounded"
              disabled={isSubmitting}
            />
            <label htmlFor="isRecurringPaused" className="ml-2 block text-sm text-primary">
              Zahlung pausieren (keine weiteren Fälligkeiten bis Fortsetzen)
            </label>
          </div>
        )}

        {!hideRecurring && formData.isRecurring && (
          <div>
            <label htmlFor="recurringInterval" className="block text-sm font-medium text-primary">
              Wiederholungsintervall
            </label>
            <select
              id="recurringInterval"
              value={formData.recurringInterval}
              onChange={(e) => setFormData({ ...formData, recurringInterval: e.target.value })}
              className="mt-1 block w-full rounded-control border-border bg-surface shadow-sm focus:ring-accent"
              disabled={isSubmitting}
            >
              <option value="monthly">Monatlich</option>
              <option value="quarterly">Vierteljährlich</option>
              <option value="yearly">Jährlich</option>
            </select>
          </div>
        )}

        <TransferAccountFields
          transferTargets={transferTargets}
          isTransfer={isTransfer}
          transferTargetAccountId={transferTargetAccountId}
          onIsTransferChange={(value) => {
            setIsTransfer(value)
            if (value) {
              setFormData((prev) => ({ ...prev, type: 'expense' }))
            }
          }}
          onTargetChange={setTransferTargetAccountId}
          disabled={isSubmitting}
          idPrefix="edit-transfer"
        />

        {isTransfer && hasActivePair && linkedTargetName && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-secondary">
              Verknüpft mit Gegenbuchung in „{linkedTargetName}“
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleUnlinkTransfer}
              disabled={isSubmitting}
            >
              Umbuchung trennen
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="danger-outline"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isSubmitting}
          >
            Löschen
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
              Abbrechen
            </Button>
          )}
          <Button type="submit" loading={isSubmitting} loadingText="Wird gespeichert…">
            Speichern
          </Button>
        </div>
      </form>
    </>
  )
}
