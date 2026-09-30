'use client'

import { useMemo } from 'react'
import { useCategories } from '@/hooks/useLookups'

interface CategorySelectProps {
  id?: string
  value: string
  onChange: (categoryId: string) => void
  suggestedCategoryIds?: string[]
  disabled?: boolean
  isSuggestion?: boolean
}

export default function CategorySelect({
  id = 'categoryId',
  value,
  onChange,
  suggestedCategoryIds = [],
  disabled = false,
  isSuggestion = false,
}: CategorySelectProps) {
  const { categories, loading } = useCategories({
    onError: (err) => console.error('Error loading categories:', err),
  })

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  )

  const suggestedSet = useMemo(
    () => new Set(suggestedCategoryIds),
    [suggestedCategoryIds]
  )

  const suggested = sortedCategories.filter((c) => suggestedSet.has(c.id))
  const other = sortedCategories.filter((c) => !suggestedSet.has(c.id))

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-primary">
        Kategorie
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-control border-border bg-surface shadow-sm focus:ring-accent sm:text-sm"
        disabled={disabled || loading}
      >
        <option value="">
          {isSuggestion ? 'Vorschlag (optional)' : 'Keine Kategorie'}
        </option>
        {suggested.length > 0 && (
          <optgroup label="Händler-Kategorien">
            {suggested.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </optgroup>
        )}
        {other.length > 0 && (
          <optgroup label={suggested.length > 0 ? 'Alle Kategorien' : 'Kategorien'}>
            {other.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {isSuggestion && value && (
        <p className="mt-1 text-xs text-secondary">
          Vorgeschlagene Kategorie – wird erst beim Speichern übernommen, wenn Sie sie
          auswählen oder ändern.
        </p>
      )}
    </div>
  )
}
