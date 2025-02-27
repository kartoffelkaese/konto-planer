'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/Modal'

interface Merchant {
  id: string
  name: string
  description?: string | null
  category?: string | null
  createdAt: string
}

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: ''
  })

  useEffect(() => {
    loadMerchants()
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
      setFormData({ name: '', description: '', category: '' })
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
      setFormData({ name: '', description: '', category: '' })
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

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {merchants.length === 0 ? (
            <li className="px-6 py-8 text-center text-gray-500">
              Keine Händler vorhanden
            </li>
          ) : (
            merchants.map((merchant) => (
              <li key={merchant.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{merchant.name}</h3>
                  {merchant.description && (
                    <p className="mt-1 text-sm text-gray-500">{merchant.description}</p>
                  )}
                  {merchant.category && (
                    <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {merchant.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => {
                      setSelectedMerchant(merchant)
                      setFormData({
                        name: merchant.name,
                        description: merchant.description || '',
                        category: merchant.category || ''
                      })
                      setShowEditModal(true)
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMerchant(merchant)
                      setShowDeleteModal(true)
                    }}
                    className="text-red-400 hover:text-red-500"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Händler hinzufügen Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setFormData({ name: '', description: '', category: '' })
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
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Beschreibung
            </label>
            <input
              type="text"
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Kategorie
            </label>
            <input
              type="text"
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false)
                setFormData({ name: '', description: '', category: '' })
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
          setFormData({ name: '', description: '', category: '' })
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
            />
          </div>
          <div>
            <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">
              Beschreibung
            </label>
            <input
              type="text"
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700">
              Kategorie
            </label>
            <input
              type="text"
              id="edit-category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false)
                setSelectedMerchant(null)
                setFormData({ name: '', description: '', category: '' })
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