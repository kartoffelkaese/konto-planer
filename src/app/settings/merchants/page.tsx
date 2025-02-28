'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/Modal'

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
    } catch (err) {
      console.error('Error creating merchant:', err)
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Händlers')
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMerchant) return
    setError(null)

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
    } catch (err) {
      console.error('Error updating merchant:', err)
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Händlers')
    }
  }

  const handleDelete = async () => {
    if (!selectedMerchant) return
    setError(null)

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
    } catch (err) {
      console.error('Error deleting merchant:', err)
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen des Händlers')
    }
  }

  const filteredMerchants = merchants.filter(merchant => {
    const matchesSearch = merchant.name.toLowerCase().includes(filters.search.toLowerCase())
    const matchesCategory = !filters.categoryId || merchant.categoryId === filters.categoryId
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return <div className="p-8 flex items-center justify-center">Laden...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Händler verwalten</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Händler hinzufügen
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Filter-Bereich */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Suche
            </label>
            <input
              type="text"
              id="search"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Nach Namen suchen..."
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="categoryFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Kategorie
            </label>
            <select
              id="categoryFilter"
              value={filters.categoryId}
              onChange={(e) => setFilters(prev => ({ ...prev, categoryId: e.target.value }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Alle Kategorien</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        {merchants.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Keine Händler vorhanden
          </div>
        ) : filteredMerchants.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Keine Händler gefunden
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {filteredMerchants.map((merchant) => (
              <div
                key={merchant.id}
                className="relative bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-lg font-medium text-gray-900">{merchant.name}</h3>
                  </div>
                  
                  {merchant.category && (
                    <div className="space-y-2">
                      <div 
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                        style={{ 
                          backgroundColor: merchant.category.color,
                          color: getContrastColor(merchant.category.color)
                        }}
                      >
                        {merchant.category.name}
                      </div>
                    </div>
                  )}

                  <div className="absolute top-3 right-3 flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedMerchant(merchant)
                        setFormData({
                          name: merchant.name,
                          categoryId: merchant.categoryId || ''
                        })
                        setShowEditModal(true)
                      }}
                      className="p-1 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMerchant(merchant)
                        setShowDeleteModal(true)
                      }}
                      className="p-1 text-red-400 hover:text-red-500 rounded-full hover:bg-gray-100"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Händler hinzufügen Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setFormData({ name: '', categoryId: '' })
          setError(null)
        }}
        title="Händler hinzufügen"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
              Kategorie
            </label>
            <select
              id="categoryId"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Keine Kategorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false)
                setFormData({ name: '', categoryId: '' })
                setError(null)
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Hinzufügen
            </button>
          </div>
        </form>
      </Modal>

      {/* Händler bearbeiten Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedMerchant(null)
          setFormData({ name: '', categoryId: '' })
          setError(null)
        }}
        title="Händler bearbeiten"
        maxWidth="md"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="edit-categoryId" className="block text-sm font-medium text-gray-700">
              Kategorie
            </label>
            <select
              id="edit-categoryId"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Keine Kategorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false)
                setSelectedMerchant(null)
                setFormData({ name: '', categoryId: '' })
                setError(null)
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Speichern
            </button>
          </div>
        </form>
      </Modal>

      {/* Händler löschen Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedMerchant(null)
          setError(null)
        }}
        title="Händler löschen"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Sind Sie sicher, dass Sie den Händler &quot;{selectedMerchant?.name}&quot; löschen möchten?
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false)
                setSelectedMerchant(null)
                setError(null)
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
            >
              Löschen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
} 