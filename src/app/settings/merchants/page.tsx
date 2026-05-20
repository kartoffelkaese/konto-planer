'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/Modal'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/Button'

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
    categoryId: ''
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
      setFormData({ name: '', categoryId: '' })
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
      setFormData({ name: '', categoryId: '' })
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

  const filteredMerchants = merchants
    .filter(merchant => {
    const matchesSearch = merchant.name.toLowerCase().includes(filters.search.toLowerCase())
    const matchesCategory = !filters.categoryId || merchant.categoryId === filters.categoryId
    return matchesSearch && matchesCategory
  })
    .sort((a, b) => a.name.localeCompare(b.name))

  if (loading) {
    return <div className="p-8 flex items-center justify-center">Laden...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
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
            {filteredMerchants.map((merchant) => (
              <div
                key={merchant.id}
                className="bg-surface rounded-lg shadow-sm border border-border p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {merchant.category && (
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: merchant.category.color }}
                      />
                    )}
                    <h3 className="text-lg font-medium text-primary">
                      {merchant.name}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedMerchant(merchant)
                        setFormData({ name: merchant.name, categoryId: merchant.categoryId || '' })
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
                {merchant.category && (
                  <p className="text-sm text-secondary">
                    {merchant.category.name}
                  </p>
                )}
              </div>
            ))}
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
            <label htmlFor="categoryId" className="block text-sm font-medium text-primary">
              Kategorie
            </label>
            <select
              id="categoryId"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="mt-1 block w-full rounded-control border-border shadow-sm focus:border-accent focus:ring-accent bg-surface sm:text-sm"
            >
              <option value="">Kategorie auswählen</option>
              {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
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
            <label htmlFor="edit-categoryId" className="block text-sm font-medium text-primary">
              Kategorie
            </label>
            <select
              id="edit-categoryId"
              value={formData.categoryId}
              onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
              className="mt-1 block w-full rounded-control border-border shadow-sm focus:border-accent focus:ring-accent sm:text-sm bg-surface text-primary"
            >
              <option value="">Keine Kategorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
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