'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getTransaction, updateTransaction, deleteTransaction } from '@/lib/api'
import { formatDateForInput } from '@/lib/dateUtils'

interface EditTransactionFormProps {
  id: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function EditTransactionForm({ id, onSuccess, onCancel }: EditTransactionFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
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
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    try {
      await deleteTransaction(id)
      onSuccess?.()
      router.refresh()
    } catch (err) {
      console.error('Error deleting transaction:', err)
      setError('Fehler beim Löschen der Transaktion')
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
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
      onSuccess?.()
      router.refresh()
    } catch (err) {
      console.error('Error updating transaction:', err)
      setError('Fehler beim Aktualisieren der Transaktion')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-4 flex items-center justify-center">Laden...</div>
  }

  if (error) {
    return (
      <div className="p-4 flex items-center justify-center text-red-600">
        {error}
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-opacity-75 flex items-center justify-center">
          <div className="p-6 rounded-lg shadow-xl max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Transaktion löschen</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Möchten Sie diese Transaktion wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                disabled={loading}
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-500 border border-transparent rounded-md shadow-sm hover:bg-red-700 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Wird gelöscht...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="merchant" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Händler
          </label>
          <input
            type="text"
            id="merchant"
            value={formData.merchant}
            onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-dark-light shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
            placeholder="z.B. Amazon, Lidl, etc."
            required
            disabled={loading}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Beschreibung
          </label>
          <input
            type="text"
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-dark-light shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Betrag (€)
            </label>
            <input
              type="number"
              id="amount"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-dark-light shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Typ
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-dark-light shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              disabled={loading}
            >
              <option value="expense">Ausgabe</option>
              <option value="income">Einnahme</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Datum
          </label>
          <input
            type="date"
            id="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-dark-light shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
            required
            disabled={loading}
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isRecurring"
            checked={formData.isRecurring}
            onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-dark-light rounded"
            disabled={loading}
          />
          <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Wiederkehrende Zahlung
          </label>
        </div>

        {formData.isRecurring && (
          <div>
            <label htmlFor="recurringInterval" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Wiederholungsintervall
            </label>
            <select
              id="recurringInterval"
              value={formData.recurringInterval}
              onChange={(e) => setFormData({ ...formData, recurringInterval: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-dark-light shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              disabled={loading}
            >
              <option value="monthly">Monatlich</option>
              <option value="quarterly">Vierteljährlich</option>
              <option value="yearly">Jährlich</option>
            </select>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-600 rounded-md shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-400"
          >
            Löschen
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              Abbrechen
            </button>
          )}
            <button
              type="submit"
              disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 border border-transparent rounded-md shadow-sm hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Wird gespeichert...' : 'Speichern'}
            </button>
        </div>
      </form>
    </>
  )
} 