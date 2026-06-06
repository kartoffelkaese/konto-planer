'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/Modal'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/Button'
import PageLoader from '@/components/PageLoader'
import SettingsBreadcrumb from '@/components/SettingsBreadcrumb'

// Funktion zur Berechnung der Textfarbe basierend auf der Hintergrundfarbe
function getContrastColor(hexcolor: string) {
  // Entferne das #-Zeichen, falls vorhanden
  const hex = hexcolor.replace('#', '')
  
  // Konvertiere zu RGB
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  // Berechne die relative Helligkeit
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  
  // Wenn die Helligkeit über 128 liegt, verwende schwarzen Text, sonst weißen
  return brightness > 128 ? '#000000' : '#FFFFFF'
}

interface Category {
  id: string
  name: string
  color: string
}

interface Merchant {
  id: string
  name: string
  categoryId?: string | null
  category?: Category | null
  categories?: Category[]
  categoryIds?: string[]
  createdAt: string
}

export default function MerchantsPage() {
  const { showToast } = useToast()
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    categoryIds: [] as string[],
  })
  const [filters, setFilters] = useState({
    search: '',
    categoryId: ''
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadMerchants()
    loadCategories()
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
    } finally {
      setLoading(false)
    }
  }

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
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      const response = await fetch('/api/merchants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Erstellen des Händlers')
      }

      await loadMerchants()
      setShowAddModal(false)
      setFormData({ name: '', categoryIds: [] })
      showToast('Händler erstellt', 'success')
    } catch (err) {
      console.error('Error creating merchant:', err)
      const message = err instanceof Error ? err.message : 'Fehler beim Erstellen des Händlers'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMerchant) return
    setError(null)
    setIsSaving(true)

    try {
      const response = await fetch(`/api/merchants/${selectedMerchant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Aktualisieren des Händlers')
      }

      await loadMerchants()
      setShowEditModal(false)
      setSelectedMerchant(null)
      setFormData({ name: '', categoryIds: [] })
      showToast('Händler gespeichert', 'success')
    } catch (err) {
      console.error('Error updating merchant:', err)
      const message = err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Händlers'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedMerchant) return
    setError(null)
    setIsSaving(true)

    try {
      const response = await fetch(`/api/merchants/${selectedMerchant.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Löschen des Händlers')
      }

      await loadMerchants()
      setShowDeleteModal(false)
      setSelectedMerchant(null)
      showToast('Händler gelöscht', 'success')
    } catch (err) {
      console.error('Error deleting merchant:', err)
      const message = err instanceof Error ? err.message : 'Fehler beim Löschen des Händlers'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const getMerchantCategoryIds = (merchant: Merchant): string[] =>
    merchant.categoryIds ??
    merchant.categories?.map((category) => category.id) ??
    (merchant.categoryId ? [merchant.categoryId] : [])

  const toggleCategoryId = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter((id) => id !== categoryId)
        : [...prev.categoryIds, categoryId],
    }))
  }

  const filteredMerchants = merchants
    .filter((merchant) => {
      const matchesSearch = merchant.name
        .toLowerCase()
        .includes(filters.search.toLowerCase())
      const merchantCategoryIds = getMerchantCategoryIds(merchant)
      const matchesCategory =
        !filters.categoryId || merchantCategoryIds.includes(filters.categoryId)
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  if (loading) {
    return <PageLoader message="Händler werden geladen…" />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SettingsBreadcrumb current="Händler" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title">Händler verwalten</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-control shadow-sm text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Händler hinzufügen
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-danger-subtle text-danger rounded-lg">
          {error}
        </div>
      )}

      {/* Filter-Bereich */}
      <div className="bg-surface rounded-lg border border-border p-4 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div>
            <label htmlFor="categoryFilter" className="block text-sm font-medium text-primary mb-1">
              Kategorie
            </label>
            <select
              id="categoryFilter"
              value={filters.categoryId}
              onChange={(e) => setFilters(prev => ({ ...prev, categoryId: e.target.value }))}
              className="block w-full rounded-control border-border shadow-sm focus:border-accent focus:ring-accent sm:text-sm bg-surface text-primary"
            >
              <option value="">Alle Kategorien</option>
              {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 mb-8 bg-surface">
        {merchants.length === 0 ? (
          <div className="px-6 py-8 text-center text-secondary">
            Keine Händler vorhanden
          </div>
        ) : filteredMerchants.length === 0 ? (
          <div className="px-6 py-8 text-center text-secondary">
            Keine Händler gefunden
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
            {filteredMerchants.map((merchant) => {
              const merchantCategories =
                merchant.categories ??
                (merchant.category ? [merchant.category] : [])
              return (
              <div
                key={merchant.id}
                className="bg-surface rounded-lg shadow-sm border border-border p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-primary">
                    {merchant.name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedMerchant(merchant)
                        setFormData({
                          name: merchant.name,
                          categoryIds: getMerchantCategoryIds(merchant),
                        })
                        setShowEditModal(true)
                      }}
                      className="text-secondary hover:text-primary"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMerchant(merchant)
                        setShowDeleteModal(true)
                      }}
                      className="text-secondary hover:text-danger"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                {merchantCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {merchantCategories.map((category) => (
                      <span
                        key={category.id}
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: category.color,
                          color: getContrastColor(category.color),
                        }}
                      >
                        {category.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>

      {/* Modal für neuen Händler */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Neuer Händler"
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
            <span className="block text-sm font-medium text-primary mb-2">
              Kategorien
            </span>
            <div className="space-y-2 max-h-48 overflow-y-auto rounded-control border border-border p-3">
              {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((category) => (
                <label key={category.id} className="flex items-center gap-2 text-sm text-primary">
                  <input
                    type="checkbox"
                    checked={formData.categoryIds.includes(category.id)}
                    onChange={() => toggleCategoryId(category.id)}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <span
                    className="inline-block w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}
                </label>
              ))}
            </div>
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
        title="Händler bearbeiten"
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
            <span className="block text-sm font-medium text-primary mb-2">
              Kategorien
            </span>
            <div className="space-y-2 max-h-48 overflow-y-auto rounded-control border border-border p-3">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 text-sm text-primary">
                  <input
                    type="checkbox"
                    checked={formData.categoryIds.includes(category.id)}
                    onChange={() => toggleCategoryId(category.id)}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <span
                    className="inline-block w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}
                </label>
              ))}
            </div>
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
        title="Händler löschen"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Möchten Sie den Händler "{selectedMerchant?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
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