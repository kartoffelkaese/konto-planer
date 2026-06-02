'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createTransaction } from '@/lib/api'
import { formatDateForInput } from '@/lib/dateUtils'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/Button'
import TransferAccountFields, { type TransferTarget } from '@/components/TransferAccountFields'
import {
  findExactMerchantMatch,
  findSimilarMerchant,
} from '@/lib/merchantMatching'

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
  const { showToast } = useToast()
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
  const [forceNewMerchant, setForceNewMerchant] = useState(false)
  const [transferTargets, setTransferTargets] = useState<TransferTarget[]>([])
  const [isTransfer, setIsTransfer] = useState(false)
  const [transferTargetAccountId, setTransferTargetAccountId] = useState('')

  useEffect(() => {
    loadMerchants()
    loadTransferTargets()
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isTransfer && !transferTargetAccountId) {
        setError('Bitte wählen Sie ein Zielkonto für die Umbuchung.')
        setLoading(false)
        return
      }

      const trimmedMerchant = formData.merchant.trim()
      if (
        !formData.merchantId &&
        similarMerchantSuggestion &&
        !forceNewMerchant
      ) {
        setError('Bitte bestätigen Sie, ob der vorgeschlagene Händler gemeint ist.')
        setLoading(false)
        return
      }

      const amount = isTransfer
        ? -Math.abs(parseFloat(formData.amount))
        : formData.type === 'income'
          ? Math.abs(parseFloat(formData.amount))
          : -Math.abs(parseFloat(formData.amount))

      const selectedMerchant = merchants.find(m => m.id === formData.merchantId)

      await createTransaction({
        merchant: selectedMerchant?.name || trimmedMerchant,
        merchantId: formData.merchantId || undefined,
        createNewMerchant: forceNewMerchant || undefined,
        isTransfer: isTransfer || undefined,
        transferTargetAccountId: isTransfer ? transferTargetAccountId : undefined,
        description: formData.description,
        amount,
        date: new Date(formData.date).toISOString(),
        isRecurring: formData.isRecurring,
        recurringInterval: formData.isRecurring ? formData.recurringInterval : undefined
      })

      showToast('Transaktion erstellt', 'success')
      onSuccess?.()
      router.refresh()
    } catch (err) {
      console.error('Error creating transaction:', err)
      setError('Fehler beim Erstellen der Transaktion')
      showToast('Fehler beim Erstellen der Transaktion', 'error')
    } finally {
      setLoading(false)
    }
  }

  const sortedMerchants = [...merchants].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  const handleMerchantInput = (value: string) => {
    setForceNewMerchant(false)
    const trimmed = value.trim()
    const match = findExactMerchantMatch(sortedMerchants, trimmed)
    if (match) {
      setFormData((prev) => ({
        ...prev,
        merchantId: match.id,
        merchant: match.name,
        description: prev.description || match.description || '',
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        merchantId: '',
        merchant: value,
      }))
    }
  }

  const handleUseSimilarMerchant = (merchant: Merchant) => {
    setForceNewMerchant(false)
    setFormData((prev) => ({
      ...prev,
      merchantId: merchant.id,
      merchant: merchant.name,
      description: prev.description || merchant.description || '',
    }))
  }

  const handleCreateNewMerchant = () => {
    setForceNewMerchant(true)
    setFormData((prev) => ({
      ...prev,
      merchantId: '',
    }))
  }

  const merchantDisplay =
    formData.merchantId
      ? sortedMerchants.find((m) => m.id === formData.merchantId)?.name ??
        formData.merchant
      : formData.merchant

  const similarMerchantSuggestion =
    !formData.merchantId && !forceNewMerchant
      ? findSimilarMerchant(sortedMerchants, formData.merchant)
      : undefined

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-control bg-danger-subtle p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-danger">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="merchant" className="block text-sm font-medium text-primary">
          Händler
        </label>
        <div className="mt-1">
          <input
            type="text"
            id="merchant"
            list={sortedMerchants.length > 0 ? 'merchant-suggestions' : undefined}
            value={merchantDisplay}
            onChange={(e) => handleMerchantInput(e.target.value)}
            className="block w-full rounded-control border-border bg-surface shadow-sm focus:ring-accent sm:text-sm"
            placeholder="z.B. Amazon, Lidl, etc."
            required
            disabled={loading}
            autoFocus
          />
          {sortedMerchants.length > 0 && (
            <datalist id="merchant-suggestions">
              {sortedMerchants.map((merchant) => (
                <option key={merchant.id} value={merchant.name} />
              ))}
            </datalist>
          )}
          {similarMerchantSuggestion && (
            <div className="mt-2 rounded-control border border-accent-border bg-accent-subtle p-3">
              <p className="text-sm text-primary">
                Meinst du „{similarMerchantSuggestion.name}"?
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleUseSimilarMerchant(similarMerchantSuggestion)}
                  disabled={loading}
                >
                  Ja, {similarMerchantSuggestion.name} verwenden
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleCreateNewMerchant}
                  disabled={loading}
                >
                  Nein, neu anlegen
                </Button>
              </div>
            </div>
          )}
        </div>
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
          className="mt-1 block w-full rounded-control border-border bg-surface shadow-sm focus:ring-accent sm:text-sm"
          disabled={loading}
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
            className="mt-1 block w-full rounded-control border-border bg-surface shadow-sm focus:ring-accent sm:text-sm"
            required
            disabled={loading}
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
            className="mt-1 block w-full rounded-control border-border bg-surface shadow-sm focus:ring-accent sm:text-sm"
            disabled={loading || isTransfer}
          >
            <option value="expense">Ausgabe</option>
            <option value="income">Einnahme</option>
          </select>
          {isTransfer && (
            <p className="mt-1 text-xs text-secondary">
              Umbuchungen werden immer als Ausgabe im aktiven Konto gebucht.
            </p>
          )}
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
          className="mt-1 block w-full rounded-control border-border bg-surface shadow-sm focus:ring-accent sm:text-sm"
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
          className="h-4 w-4 text-accent focus:ring-accent border-border bg-surface rounded"
          disabled={loading}
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
            className="mt-1 block w-full rounded-control border-border bg-surface shadow-sm focus:ring-accent sm:text-sm"
            disabled={loading}
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
        disabled={loading}
        idPrefix="create-transfer"
      />

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Abbrechen
          </Button>
        )}
        <Button
          type="submit"
          loading={loading}
          loadingText="Wird gespeichert…"
        >
          Speichern
        </Button>
      </div>
    </form>
  )
} 