'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getTransaction, updateTransaction, deleteTransaction } from '@/lib/api'

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
    date: new Date().toISOString().split('T')[0],
    isRecurring: false,
    recurringInterval: 'monthly'
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
        date: new Date(transaction.date).toISOString().split('T')[0],
        isRecurring: transaction.isRecurring,
        recurringInterval: transaction.recurringInterval || 'monthly'
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
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Transaktion löschen</h3>
            <p className="text-gray-600 mb-6">
              Möchten Sie diese Transaktion wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                disabled={loading}
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
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
          <label htmlFor="merchant" className="block text-sm font-medium text-gray-700">
            Händler
          </label>
          <input
            type="text"
            id="merchant"
            value={formData.merchant}
            onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="z.B. Amazon, Lidl, etc."
            required
            disabled={loading}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Beschreibung
          </label>
          <input
            type="text"
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              Betrag (€)
            </label>
            <input
              type="number"
              id="amount"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Typ
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="expense">Ausgabe</option>
              <option value="income">Einnahme</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            Datum
          </label>
          <input
            type="date"
            id="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            disabled={loading}
          />
          <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-700">
            Wiederkehrende Zahlung
          </label>
        </div>

        {formData.isRecurring && (
          <div>
            <label htmlFor="recurringInterval" className="block text-sm font-medium text-gray-700">
              Wiederholungsintervall
            </label>
            <select
              id="recurringInterval"
              value={formData.recurringInterval}
              onChange={(e) => setFormData({ ...formData, recurringInterval: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="monthly">Monatlich</option>
              <option value="quarterly">Vierteljährlich</option>
              <option value="yearly">Jährlich</option>
            </select>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
            disabled={loading}
          >
            Transaktion löschen
          </button>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
              disabled={loading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Wird gespeichert...' : 'Speichern'}
            </button>
          </div>
        </div>
      </form>
    </>
  )
} 