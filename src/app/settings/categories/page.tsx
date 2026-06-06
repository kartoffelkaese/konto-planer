'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/Modal'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/Button'
import PageLoader from '@/components/PageLoader'
import SettingsBreadcrumb from '@/components/SettingsBreadcrumb'
import { useUserSettings } from '@/hooks/useUserSettings'

const PRESET_COLORS = [
  '#FF6B6B', // Rot
  '#4ECDC4', // Türkis
  '#45B7D1', // Hellblau
  '#96CEB4', // Mintgrün
  '#FFEEAD', // Hellgelb
  '#FFD93D', // Gelb
  '#FF9F1C', // Orange
  '#A8E6CF', // Pastellgrün
  '#DCD6F7', // Lavendel
  '#F4BFBF', // Rosa
  '#95DAC1', // Mintblau
  '#B6E2D3', // Hellmint
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  id: string
}

function ColorPicker({ value, onChange, id }: ColorPickerProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-6 gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`w-8 h-8 rounded-full border-2 transition-colors hover:opacity-90 ${
              value === color ? 'border-accent ring-2 ring-accent/30' : 'border-border shadow-sm'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
      <div className="flex items-center space-x-3">
        <div className="flex-1">
          <input
            type="color"
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
          <label
            htmlFor={id}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-primary border border-border rounded-control shadow-sm hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface"
          >
            Andere Farbe wählen
          </label>
        </div>
        <div 
          className="w-10 h-10 rounded-full border-2 border-white border border-border" 
          style={{ backgroundColor: value }}
        />
      </div>
    </div>
  )
}

interface Category {
  id: string
  name: string
  color: string
  createdAt: string
  _count: {
    merchants: number
  }
}

export default function CategoriesPage() {
  const { showToast } = useToast()
  const { canWrite } = useUserSettings()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    color: '#A7C7E7'
  })
  const [filters, setFilters] = useState({
    search: ''
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Kategorien')
      }
      const data = await response.json()
      setCategories(data)
    } catch (err) {
      console.error('Error loading categories:', err)
      setError('Fehler beim Laden der Kategorien')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Erstellen der Kategorie')
      }

      await loadCategories()
      setShowAddModal(false)
      setFormData({ name: '', color: '#A7C7E7' })
      showToast('Kategorie erstellt', 'success')
    } catch (err) {
      console.error('Error creating category:', err)
      const message = err instanceof Error ? err.message : 'Fehler beim Erstellen der Kategorie'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategory) return
    setError(null)
    setIsSaving(true)

    try {
      const response = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Aktualisieren der Kategorie')
      }

      await loadCategories()
      setShowEditModal(false)
      setSelectedCategory(null)
      setFormData({ name: '', color: '#A7C7E7' })
      showToast('Kategorie gespeichert', 'success')
    } catch (err) {
      console.error('Error updating category:', err)
      const message = err instanceof Error ? err.message : 'Fehler beim Aktualisieren der Kategorie'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedCategory) return
    setError(null)
    setIsSaving(true)

    try {
      const response = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Löschen der Kategorie')
      }

      await loadCategories()
      setShowDeleteModal(false)
      setSelectedCategory(null)
      showToast('Kategorie gelöscht', 'success')
    } catch (err) {
      console.error('Error deleting category:', err)
      const message = err instanceof Error ? err.message : 'Fehler beim Löschen der Kategorie'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredCategories = categories
    .filter(category => 
      category.name.toLowerCase().includes(filters.search.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  if (loading) {
    return <PageLoader message="Kategorien werden geladen…" />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SettingsBreadcrumb current="Kategorien" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title">Kategorien verwalten</h1>
        {canWrite && (
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-control shadow-sm text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Kategorie hinzufügen
        </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-danger-subtle text-danger rounded-lg">
          {error}
        </div>
      )}

      {/* Filter-Bereich */}
      <div className="bg-surface rounded-lg border border-border p-4 mb-8">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-primary mb-1">
            Suche
          </label>
          <input
            type="text"
            id="search"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Nach Namen suchen..."
            className="block w-full rounded-control border-border shadow-sm focus:border-accent focus:ring-accent sm:text-sm bg-surface text-primary"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 mb-8 bg-surface">
        {categories.length === 0 ? (
          <div className="px-6 py-8 text-center text-secondary">
            Keine Kategorien vorhanden
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="px-6 py-8 text-center text-secondary">
            Keine Kategorien gefunden
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
            {filteredCategories.map((category) => (
              <div 
                key={category.id} 
                className="bg-surface rounded-lg shadow-sm border border-border p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <h3 className="text-lg font-medium text-primary">
                      {category.name}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    {canWrite && (
                    <>
                    <button
                      onClick={() => {
                        setSelectedCategory(category)
                        setFormData({ name: category.name, color: category.color })
                        setShowEditModal(true)
                      }}
                      className="text-secondary hover:text-primary"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCategory(category)
                        setShowDeleteModal(true)
                      }}
                      className="text-secondary hover:text-danger"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                    </>
                    )}
                  </div>
                </div>
                <p className="text-sm text-secondary">
                  {category._count.merchants} Händler
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal für neue Kategorie */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Neue Kategorie"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-primary">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-control border-border shadow-sm focus:border-accent focus:ring-accent sm:text-sm bg-surface text-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Farbe
            </label>
            <ColorPicker
              value={formData.color}
              onChange={(color) => setFormData(prev => ({ ...prev, color }))}
              id="color-picker"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} disabled={isSaving}>
              Abbrechen
            </Button>
            <Button type="submit" loading={isSaving} loadingText="Wird erstellt…">
              Erstellen
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal für Bearbeiten */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Kategorie bearbeiten"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-primary">
              Name
            </label>
            <input
              type="text"
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-control border-border shadow-sm focus:border-accent focus:ring-accent sm:text-sm bg-surface text-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Farbe
            </label>
            <ColorPicker
              value={formData.color}
              onChange={(color) => setFormData(prev => ({ ...prev, color }))}
              id="edit-color-picker"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)} disabled={isSaving}>
              Abbrechen
            </Button>
            <Button type="submit" loading={isSaving} loadingText="Wird gespeichert…">
              Speichern
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal für Löschen */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Kategorie löschen"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Möchten Sie die Kategorie "{selectedCategory?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={isSaving}>
              Abbrechen
            </Button>
            <Button type="button" variant="danger" onClick={handleDelete} loading={isSaving} loadingText="Wird gelöscht…">
              Löschen
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
} 