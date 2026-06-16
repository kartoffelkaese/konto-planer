'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import type { SplitCategory } from '@/types/split'
import {
  createSplitCategory,
  deleteSplitCategory,
  updateSplitCategory,
} from '@/lib/api'
import {
  splitInputClass,
  splitLabelClass,
  splitListItemClass,
  splitSectionCardClass,
  splitSectionTitleClass,
} from '@/components/split/splitUiClasses'

type SplitCategoryManagerProps = {
  listId: string
  categories: SplitCategory[]
  onChange: (categories: SplitCategory[]) => void
  readOnly?: boolean
}

export default function SplitCategoryManager({
  listId,
  categories,
  onChange,
  readOnly = false,
}: SplitCategoryManagerProps) {
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return
    setLoading(true)
    setError(null)
    try {
      const category = await createSplitCategory(listId, { name })
      onChange([...categories, category])
      setNewName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEdit = async (categoryId: string) => {
    const name = editName.trim()
    if (!name) return
    setLoading(true)
    setError(null)
    try {
      const updated = await updateSplitCategory(listId, { categoryId, name })
      onChange(categories.map((c) => (c.id === categoryId ? updated : c)))
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (categoryId: string) => {
    if (
      !confirm(
        'Kategorie wirklich löschen? Verknüpfte Ausgaben werden ohne Kategorie gespeichert.'
      )
    ) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      await deleteSplitCategory(listId, { categoryId })
      onChange(categories.filter((c) => c.id !== categoryId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={splitSectionCardClass}>
      <h3 className={splitSectionTitleClass}>Kategorien</h3>
      <p className="text-sm text-secondary mb-4 -mt-2">
        Nur für diese Split-Liste — unabhängig von Haushalts-Kategorien.
      </p>

      <ul className="space-y-2 mb-4">
        {categories.map((category) => (
          <li key={category.id} className={splitListItemClass}>
            {editingId === category.id ? (
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={splitInputClass}
                />
                <Button size="sm" onClick={() => handleSaveEdit(category.id)} disabled={loading}>
                  Speichern
                </Button>
              </div>
            ) : (
              <>
                <span className="flex items-center gap-2 text-sm text-primary min-w-0 flex-1">
                  {category.color && (
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: category.color }}
                      aria-hidden="true"
                    />
                  )}
                  {category.name}
                </span>
                {!readOnly && (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(category.id)
                        setEditName(category.name)
                      }}
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      size="sm"
                      variant="danger-outline"
                      onClick={() => handleDelete(category.id)}
                      disabled={loading}
                    >
                      Löschen
                    </Button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      {!readOnly && (
        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
          <div className="min-w-0 flex-1">
            <label htmlFor="split-new-category" className="sr-only">
              Neue Kategorie
            </label>
            <input
              id="split-new-category"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Neue Kategorie"
              className={splitInputClass}
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={loading || !newName.trim()}
            className="shrink-0"
          >
            Hinzufügen
          </Button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </section>
  )
}
