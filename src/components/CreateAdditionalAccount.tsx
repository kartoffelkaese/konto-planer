'use client'

import { useState } from 'react'
import { useCreateAccount } from '@/hooks/useCreateAccount'
import { Button } from '@/components/Button'
import BankSelect from '@/components/BankSelect'

export default function CreateAdditionalAccount() {
  const { createAccount, loading } = useCreateAccount()
  const [name, setName] = useState('')
  const [bankId, setBankId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await createAccount(name, { bankId })
    if (ok) {
      setName('')
      setBankId(null)
      setExpanded(false)
    }
  }

  if (!expanded) {
    return (
      <div>
        <p className="text-sm text-secondary mb-4">
          Legen Sie ein weiteres Konto an, z. B. für einen Haushalt oder getrennte
          Buchführung. Danach können Sie in der Navigation zwischen den Konten wechseln.
        </p>
        <Button type="button" variant="secondary" onClick={() => setExpanded(true)}>
          Zusätzliches Konto anlegen
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-secondary">
        Das neue Konto startet leer mit eigenen Transaktionen, Kategorien und Händlern.
        Der Gehaltstag wird vom aktuellen Konto übernommen.
      </p>
      <div>
        <label htmlFor="additional-account-name" className="block text-sm font-medium text-primary">
          Name des neuen Kontos
        </label>
        <input
          id="additional-account-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Haushalt"
          className="mt-1 block w-full rounded-control border-border shadow-sm focus:border-accent focus:ring-accent bg-surface text-primary"
          disabled={loading}
          autoFocus
        />
      </div>
      <div>
        <label htmlFor="additional-account-bank" className="block text-sm font-medium text-primary">
          Bank (optional)
        </label>
        <p className="mt-1 mb-2 text-sm text-secondary">
          Kann später in den Einstellungen geändert werden.
        </p>
        <BankSelect
          id="additional-account-bank"
          value={bankId}
          onChange={setBankId}
          disabled={loading}
        />
      </div>
      <div className="flex flex-wrap gap-2 justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setExpanded(false)
            setName('')
            setBankId(null)
          }}
          disabled={loading}
        >
          Abbrechen
        </Button>
        <Button type="submit" loading={loading} loadingText="Wird angelegt…">
          Konto anlegen
        </Button>
      </div>
    </form>
  )
}
