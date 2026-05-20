'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getTransaction, updateTransaction, deleteTransaction } from '@/lib/api'
import { formatDateForInput } from '@/lib/dateUtils'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/Button'
import LoadingSpinner from '@/components/LoadingSpinner'

interface EditTransactionFormProps {
  id: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function EditTransactionForm({ id, onSuccess, onCancel }: EditTransactionFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formData, setFormData] = useState({
    merchant: '',
    description: '',
    amount: '',
    type: 'expense',
    date: formatDateForInput(new Date()),
    isRecurring: false,
    recurringInterval: 'monthly',
    isConfirmed: false
  })

  useEffect(() => {
    loadTransaction()
  }, [id])

  const loadTransaction = async () => {
    try {
      const transaction = await getTransaction(id)
      setFormData({
        merchant: transaction.merchant || '',
        description: transaction.description || '',
        amount: Math.abs(transaction.amount).toString(),
        type: transaction.amount >= 0 ? 'income' : 'expense',
        date: formatDateForInput(transaction.date),
        isRecurring: transaction.isRecurring,
        recurringInterval: transaction.recurringInterval || 'monthly',
        isConfirmed: transaction.isConfirmed
      })
      setError(null)
    } catch (err) {
      console.error('Error loading transaction:', err)
      setError('Fehler beim Laden der Transaktion')
    } finally {
      setIsInitialLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await deleteTransaction(id)
      showToast('Transaktion gelöscht', 'success')
      onSuccess?.()
      router.refresh()
    } catch (err) {
      console.error('Error deleting transaction:', err)
      setError('Fehler beim Löschen der Transaktion')
      showToast('Fehler beim Löschen der Transaktion', 'error')
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const amount = formData.type === 'income'
        ? Math.abs(parseFloat(formData.amount))
        : -Math.abs(parseFloat(formData.amount))

      await updateTransaction(id, {
        merchant: formData.merchant,
        description: formData.description,
        amount,
        date: new Date(formData.date).toISOString(),
        isRecurring: formData.isRecurring,
        recurringInterval: formData.isRecurring ? formData.recurringInterval : undefined
      })
      showToast('Transaktion gespeichert', 'success')
      onSuccess?.()
      router.refresh()
    } catch (err) {
      console.error('Error updating transaction:', err)
      setError('Fehler beim Aktualisieren der Transaktion')
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

  if (error) {
    return (
      <div className="p-4 flex items-center justify-center text-danger">
        {error}
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-4 bg-danger-subtle text-danger rounded-lg">
          {error}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="p-6 rounded-lg shadow-xl max-w-md w-full bg-canvas border border-border">
            <h3 className="text-lg font-semibold mb-4 text-primary">Transaktion löschen</h3>
            <p className="text-secondary mb-6">
              Möchten Sie diese Transaktion wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                loading={isSubmitting}
                loadingText="Wird gelöscht…"
              >
                Löschen
              </Button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="merchant" className="block text-sm font-medium text-primary">
            Händler
          </label>
          <input
            type="text"
            id="merchant"
            value={formData.merchant}
            onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
            className="mt-1 block w-full rounded-control border-border bg-surface shadow-sm focus:ring-accent"
            placeholder="z.B. Amazon, Lidl, etc."
            required
            disabled={isSubmitting}
            autoFocus
          />
        </div>

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
              disabled={isSubmitting}
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

        {formData.isRecurring && (
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