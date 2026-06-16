'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import type { SplitCategory } from '@/types/split'
import { createSplitCategory } from '@/lib/api'
import { splitHintClass, splitInputClass, splitLabelClass } from '@/components/split/splitUiClasses'

type SplitCategorySelectProps = {
  listId: string
  categories: SplitCategory[]
  value: string | null
  onChange: (categoryId: string | null) => void
  onCategoryCreated?: (category: SplitCategory) => void
  disabled?: boolean
}

export default function SplitCategorySelect({
  listId,
  categories,
  value,
  onChange,
  onCategoryCreated,
  disabled = false,
}: SplitCategorySelectProps) {
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return

    setCreating(true)
    setError(null)
    try {
      const category = await createSplitCategory(listId, { name })
      onCategoryCreated?.(category)
      onChange(category.id)
      setNewName('')
      setShowNew(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Anlegen')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <label htmlFor="split-expense-category" className={splitLabelClass}>
        Kategorie (optional)
      </label>
      <select
        id="split-expense-category"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        className={`mt-1 ${splitInputClass}`}
      >
        <option value="">Keine Kategorie</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      {!showNew ? (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          disabled={disabled}
          className="mt-2 text-sm text-accent hover:underline disabled:opacity-50"
        >
          + Neue Kategorie
        </button>
      ) : (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Kategoriename"
            className={`min-w-0 flex-1 ${splitInputClass}`}
          />
          <div className="flex gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
            >
              Anlegen
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowNew(false)
                setNewName('')
                setError(null)
              }}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}
      {error && <p className={`${splitHintClass} text-danger`}>{error}</p>}
    </div>
  )
}
