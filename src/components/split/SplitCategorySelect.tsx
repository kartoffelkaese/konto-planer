'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import ColorPicker, {
  DEFAULT_CATEGORY_COLOR,
  pickDefaultCategoryColor,
} from '@/components/ColorPicker'
import { getContrastColor } from '@/lib/colorUtils'
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
  const [newColor, setNewColor] = useState(() =>
    pickDefaultCategoryColor(categories.map((category) => category.color))
  )
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return

    setCreating(true)
    setError(null)
    try {
      const category = await createSplitCategory(listId, { name, color: newColor })
      onCategoryCreated?.(category)
      onChange(category.id)
      setNewName('')
      setNewColor(pickDefaultCategoryColor([...categories, category].map((c) => c.color)))
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

      {value && (
        <div className="mt-2 flex items-center gap-2 text-xs text-secondary">
          {(() => {
            const selected = categories.find((category) => category.id === value)
            if (!selected) return null
            const bg = selected.color ?? DEFAULT_CATEGORY_COLOR
            return (
              <>
                <span
                  className="inline-flex h-4 w-4 rounded-full border border-border"
                  style={{ backgroundColor: bg }}
                  aria-hidden="true"
                />
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: bg,
                    color: getContrastColor(bg),
                  }}
                >
                  {selected.name}
                </span>
              </>
            )
          })()}
        </div>
      )}

      {!showNew ? (
        <button
          type="button"
          onClick={() => {
            setNewColor(pickDefaultCategoryColor(categories.map((category) => category.color)))
            setShowNew(true)
          }}
          disabled={disabled}
          className="mt-2 text-sm text-accent hover:underline disabled:opacity-50"
        >
          + Neue Kategorie
        </button>
      ) : (
        <div className="mt-3 space-y-3 rounded-lg border border-border bg-canvas p-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Kategoriename"
            className={splitInputClass}
            aria-label="Name der neuen Kategorie"
          />
          <div>
            <p className={`${splitLabelClass} mb-2`}>Farbe</p>
            <ColorPicker
              id="split-expense-category-color-new"
              value={newColor}
              onChange={setNewColor}
              compact
            />
          </div>
          <div className="flex gap-2">
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
