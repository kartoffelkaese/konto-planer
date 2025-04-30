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
              value === color ? 'border-blue-500 dark:border-blue-400 shadow-lg scale-110' : 'border-white dark:border-gray-800 shadow-sm'
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
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-dark-light"
          >
            Andere Farbe wählen
          </label>
        </div>
        <div 
          className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 shadow-md" 
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

  const filteredCategories = categories
    .filter(category => 
      category.name.toLowerCase().includes(filters.search.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  if (loading) {
    return <div className="p-8 flex items-center justify-center">Laden...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kategorien verwalten</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Kategorie hinzufügen
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* Filter-Bereich */}
      <div className="bg-white dark:bg-dark-light rounded-lg shadow-md p-4 mb-8">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Suche
          </label>
          <input
            type="text"
            id="search"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Nach Namen suchen..."
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="rounded-lg shadow-md p-4 mb-8 bg-white dark:bg-dark-light">
        {categories.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            Keine Kategorien vorhanden
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            Keine Kategorien gefunden
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
            {filteredCategories.map((category) => (
              <div 
                key={category.id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {category.name}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedCategory(category)
                        setFormData({ name: category.name, color: category.color })
                        setShowEditModal(true)
                      }}
                      className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCategory(category)
                        setShowDeleteModal(true)
                      }}
                      className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
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
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Farbe
            </label>
            <ColorPicker
              value={formData.color}
              onChange={(color) => setFormData(prev => ({ ...prev, color }))}
              id="color-picker"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
            >
              Erstellen
            </button>
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
            <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              type="text"
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Farbe
            </label>
            <ColorPicker
              value={formData.color}
              onChange={(color) => setFormData(prev => ({ ...prev, color }))}
              id="edit-color-picker"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
            >
              Speichern
            </button>
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
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Möchten Sie die Kategorie "{selectedCategory?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
            >
              Abbrechen
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-900"
            >
              Löschen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
} 