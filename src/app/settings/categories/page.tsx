'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/Modal'

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
            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
              value === color ? 'border-blue-500 shadow-lg scale-110' : 'border-white shadow-sm'
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
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 cursor-pointer"
          >
            Andere Farbe wählen
          </label>
        </div>
        <div 
          className="w-10 h-10 rounded-full border-2 border-white shadow-md" 
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
    } catch (err) {
      console.error('Error creating category:', err)
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen der Kategorie')
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategory) return
    setError(null)

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
    } catch (err) {
      console.error('Error updating category:', err)
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren der Kategorie')
    }
  }

  const handleDelete = async () => {
    if (!selectedCategory) return
    setError(null)

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
    } catch (err) {
      console.error('Error deleting category:', err)
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen der Kategorie')
    }
  }

  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(filters.search.toLowerCase())
    return matchesSearch
  })

  if (loading) {
    return <div className="p-8 flex items-center justify-center">Laden...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kategorien verwalten</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Kategorie hinzufügen
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Filter-Bereich */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-8">
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
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-8">
        {categories.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Keine Kategorien vorhanden
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Keine Kategorien gefunden
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {filteredCategories.map((category) => (
              <div 
                key={category.id} 
                className="relative bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm" 
                      style={{ backgroundColor: category.color }}
                    />
                    <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="flex-1">Zugewiesene Händler</span>
                      <span className="font-medium">{category._count.merchants}</span>
                    </div>
                  </div>

                  <div className="absolute top-3 right-3 flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedCategory(category)
                        setFormData({
                          name: category.name,
                          color: category.color
                        })
                        setShowEditModal(true)
                      }}
                      className="p-1 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCategory(category)
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

      {/* Kategorie hinzufügen Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setFormData({ name: '', color: '#A7C7E7' })
          setError(null)
        }}
        title="Kategorie hinzufügen"
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
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Farbe
            </label>
            <ColorPicker
              id="color"
              value={formData.color}
              onChange={(color) => setFormData({ ...formData, color })}
            />
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false)
                setFormData({ name: '', color: '#A7C7E7' })
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

      {/* Kategorie bearbeiten Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedCategory(null)
          setFormData({ name: '', color: '#A7C7E7' })
          setError(null)
        }}
        title="Kategorie bearbeiten"
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
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Farbe
            </label>
            <ColorPicker
              id="edit-color"
              value={formData.color}
              onChange={(color) => setFormData({ ...formData, color })}
            />
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false)
                setSelectedCategory(null)
                setFormData({ name: '', color: '#A7C7E7' })
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

      {/* Kategorie löschen Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedCategory(null)
          setError(null)
        }}
        title="Kategorie löschen"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Sind Sie sicher, dass Sie die Kategorie &quot;{selectedCategory?.name}&quot; löschen möchten?
            {selectedCategory?._count.merchants > 0 && (
              <>
                <br /><br />
                Diese Kategorie wird bei {selectedCategory._count.merchants} {selectedCategory._count.merchants === 1 ? 'Händler' : 'Händlern'} entfernt.
              </>
            )}
          </p>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false)
                setSelectedCategory(null)
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