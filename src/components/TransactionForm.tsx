'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createTransaction } from '@/lib/api'
import { formatDateForInput } from '@/lib/dateUtils'

interface Merchant {
  id: string
  name: string
  description?: string | null
  category?: {
    id: string
    name: string
  } | null
}

interface TransactionFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  defaultIsRecurring?: boolean
}

export default function TransactionForm({ 
  onSuccess, 
  onCancel,
  defaultIsRecurring = false 
}: TransactionFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [formData, setFormData] = useState({
    merchant: '',
    merchantId: '',
    description: '',
    amount: '',
    type: 'expense',
    date: formatDateForInput(new Date()),
    isRecurring: defaultIsRecurring,
    recurringInterval: 'monthly'
  })

  useEffect(() => {
    loadMerchants()
  }, [])

  const loadMerchants = async () => {
    try {
      const response = await fetch('/api/merchants')
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Händler')
      }
      const data = await response.json()
      setMerchants(data)
    } catch (err) {
      console.error('Error loading merchants:', err)
      setError('Fehler beim Laden der Händler')
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

      const selectedMerchant = merchants.find(m => m.id === formData.merchantId)

      await createTransaction({
        merchant: selectedMerchant?.name || formData.merchant,
        merchantId: formData.merchantId || undefined,
        description: formData.description,
        amount,
        date: new Date(formData.date).toISOString(),
        isRecurring: formData.isRecurring,
        recurringInterval: formData.isRecurring ? formData.recurringInterval : undefined
      })

      onSuccess?.()
      router.refresh()
    } catch (err) {
      console.error('Error creating transaction:', err)
      setError('Fehler beim Erstellen der Transaktion')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { id, value } = e.target
    setFormData({ ...formData, [id]: value })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="merchant" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Händler
        </label>
        <div className="mt-1">
          {merchants.length > 0 ? (
            <select
              id="merchantId"
              value={formData.merchantId}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-dark-light shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 sm:text-sm"
              autoFocus
            >
              <option value="">Händler auswählen oder neu eingeben</option>
              {[...merchants].sort((a, b) => a.name.localeCompare(b.name)).map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.name}
                  {merchant.category ? ` (${merchant.category.name})` : ''}
                </option>
              ))}
            </select>
          ) : null}
          {(!merchants.length || !formData.merchantId) && (
            <input
              type="text"
              id="merchant"
              value={formData.merchant}
              onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-dark-light shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 sm:text-sm"
              placeholder="z.B. Amazon, Lidl, etc."
              required
              disabled={loading}
              autoFocus
            />
          )}
        </div>
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
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-dark-light shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 sm:text-sm"
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
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-dark-light shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 sm:text-sm"
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
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-dark-light shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 sm:text-sm"
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
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-dark-light shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 sm:text-sm"
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
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-dark-light shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 sm:text-sm"
            disabled={loading}
          >
            <option value="monthly">Monatlich</option>
            <option value="quarterly">Vierteljährlich</option>
            <option value="yearly">Jährlich</option>
          </select>
        </div>
      )}

      <div className="flex justify-end space-x-3">
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
  )
} 