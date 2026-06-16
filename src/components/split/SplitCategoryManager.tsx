'use client'

import { useState } from 'react'
import { ExclamationCircleIcon, PlusIcon, TagIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import { useToast } from '@/hooks/useToast'
import ColorPicker, {
  DEFAULT_CATEGORY_COLOR,
  pickDefaultCategoryColor,
} from '@/components/ColorPicker'
import { getContrastColor } from '@/lib/colorUtils'
import type { SplitCategory } from '@/types/split'
import {
  createSplitCategory,
  deleteSplitCategory,
  updateSplitCategory,
} from '@/lib/api'
import {
  splitInputClass,
  splitLabelClass,
  splitSectionCardClass,
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
  const { showToast } = useToast()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(() =>
    pickDefaultCategoryColor(categories.map((category) => category.color))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(DEFAULT_CATEGORY_COLOR)

  const startEdit = (category: SplitCategory) => {
    setEditingId(category.id)
    setEditName(category.name)
    setEditColor(category.color ?? DEFAULT_CATEGORY_COLOR)
    setShowAddForm(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditColor(DEFAULT_CATEGORY_COLOR)
  }

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return
    setLoading(true)
    setError(null)
    try {
      const category = await createSplitCategory(listId, { name, color: newColor })
      onChange([...categories, category])
      setNewName('')
      setNewColor(pickDefaultCategoryColor([...categories, category].map((c) => c.color)))
      setShowAddForm(false)
      showToast(`Kategorie „${category.name}" angelegt`, 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kategorie konnte nicht angelegt werden'
      setError(message)
      showToast(message, 'error')
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
      const updated = await updateSplitCategory(listId, {
        categoryId,
        name,
        color: editColor,
      })
      onChange(categories.map((c) => (c.id === categoryId ? updated : c)))
      cancelEdit()
      showToast('Kategorie gespeichert', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Speichern fehlgeschlagen'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    if (
      !confirm(
        `Kategorie „${category?.name ?? 'Unbekannt'}" wirklich löschen? Verknüpfte Ausgaben werden ohne Kategorie gespeichert.`
      )
    ) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      await deleteSplitCategory(listId, { categoryId })
      onChange(categories.filter((c) => c.id !== categoryId))
      showToast('Kategorie gelöscht', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Löschen fehlgeschlagen'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={`${splitSectionCardClass} overflow-hidden p-0`}>
      <header className="flex items-start gap-3 border-b border-accent-border bg-accent-subtle px-4 py-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-accent-border bg-surface text-accent">
          <TagIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-medium text-primary">Kategorien</h3>
          <p className="text-xs text-secondary">
            Nur für diese Liste · {categories.length}{' '}
            {categories.length === 1 ? 'Kategorie' : 'Kategorien'}
          </p>
        </div>
      </header>

      {error && (
        <div
          className="mx-4 mt-4 flex items-start gap-3 rounded-card border border-danger/20 bg-danger-subtle px-3 py-2.5 text-sm text-danger"
          role="alert"
        >
          <ExclamationCircleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {categories.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-secondary">
          Noch keine Kategorien — legen Sie welche an, um Ausgaben zu gruppieren.
        </p>
      ) : (
        <ul className="divide-y divide-border bg-canvas">
          {categories.map((category) => {
            const bg = category.color ?? DEFAULT_CATEGORY_COLOR
            const isEditing = editingId === category.id

            return (
              <li
                key={category.id}
                className="transition-colors hover:bg-surface-muted"
                style={{ borderLeftWidth: 4, borderLeftColor: bg }}
              >
                {isEditing ? (
                  <div className="space-y-3 px-4 py-3">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={splitInputClass}
                      aria-label="Kategoriename bearbeiten"
                    />
                    <div>
                      <p className={`${splitLabelClass} mb-2`}>Farbe</p>
                      <ColorPicker
                        id={`split-category-color-edit-${category.id}`}
                        value={editColor}
                        onChange={setEditColor}
                        compact
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(category.id)}
                        disabled={loading}
                      >
                        Speichern
                      </Button>
                      <Button size="sm" variant="secondary" onClick={cancelEdit} disabled={loading}>
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold"
                      style={{ backgroundColor: bg, color: getContrastColor(bg) }}
                      aria-hidden="true"
                    >
                      {category.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">
                      {category.name}
                    </span>
                    {!readOnly && (
                      <div className="flex shrink-0 gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(category)}>
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
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {!readOnly && (
        <div className="border-t border-border bg-surface px-4 py-3">
          {!showAddForm ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setError(null)
                cancelEdit()
                setNewColor(pickDefaultCategoryColor(categories.map((category) => category.color)))
                setShowAddForm(true)
              }}
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              Kategorie hinzufügen
            </Button>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="split-new-category" className={splitLabelClass}>
                  Name
                </label>
                <input
                  id="split-new-category"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="z. B. Essen, Transport"
                  className={`mt-1 ${splitInputClass}`}
                />
              </div>
              <div>
                <p className={`${splitLabelClass} mb-2`}>Farbe</p>
                <ColorPicker
                  id="split-category-color-new"
                  value={newColor}
                  onChange={setNewColor}
                  compact
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleAdd} disabled={loading || !newName.trim()} size="sm">
                  Hinzufügen
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false)
                    setNewName('')
                    setError(null)
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
