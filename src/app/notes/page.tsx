'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useToast } from '@/hooks/useToast'

interface Note {
  id: number
  title: string
  content: string
  isActive: boolean
  months: { id: number; month: number }[]
}

export default function NotesPage() {
  const { data: session } = useSession()
  const [notes, setNotes] = useState<Note[]>([])
  const [showNewNoteModal, setShowNewNoteModal] = useState(false)
  const [showEditNoteModal, setShowEditNoteModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    try {
      const response = await fetch('/api/notes')
      if (!response.ok) throw new Error('Failed to fetch notes')
      const data = await response.json()
      setNotes(data)
    } catch (error) {
      console.error('Error fetching notes:', error)
      showToast('Fehler beim Laden der Notizen', 'error')
    }
  }

  const handleCreateNote = async (note: Omit<Note, 'id'>) => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note),
      })
      if (!response.ok) throw new Error('Failed to create note')
      await fetchNotes()
      setShowNewNoteModal(false)
      showToast('Notiz erfolgreich erstellt', 'success')
    } catch (error) {
      console.error('Error creating note:', error)
      showToast('Fehler beim Erstellen der Notiz', 'error')
    }
  }

  const handleUpdateNote = async (note: Note) => {
    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note),
      })
      if (!response.ok) throw new Error('Failed to update note')
      await fetchNotes()
      setShowEditNoteModal(false)
      showToast('Notiz erfolgreich aktualisiert', 'success')
    } catch (error) {
      console.error('Error updating note:', error)
      showToast('Fehler beim Aktualisieren der Notiz', 'error')
    }
  }

  const handleDeleteNote = async () => {
    if (!selectedNote) return
    try {
      const response = await fetch(`/api/notes/${selectedNote.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete note')
      await fetchNotes()
      setShowDeleteDialog(false)
      showToast('Notiz erfolgreich gelöscht', 'success')
    } catch (error) {
      console.error('Error deleting note:', error)
      showToast('Fehler beim Löschen der Notiz', 'error')
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Bitte melden Sie sich an, um Notizen zu verwalten.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notizen</h1>
        <button
          onClick={() => setShowNewNoteModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Neue Notiz
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className="bg-white dark:bg-dark-light rounded-lg shadow p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">{note.title}</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedNote(note)
                    setShowEditNoteModal(true)
                  }}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    setSelectedNote(note)
                    setShowDeleteDialog(true)
                  }}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{note.content}</p>
            <div className="flex flex-wrap gap-2">
              {note.months.map(({ month }) => (
                <span
                  key={month}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  {new Date(2000, month - 1).toLocaleString('de-DE', { month: 'long' })}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Neue Notiz Modal */}
      <Modal
        isOpen={showNewNoteModal}
        onClose={() => setShowNewNoteModal(false)}
        title="Neue Notiz"
      >
        <NoteForm
          onSubmit={handleCreateNote}
          onCancel={() => setShowNewNoteModal(false)}
        />
      </Modal>

      {/* Bearbeiten Modal */}
      <Modal
        isOpen={showEditNoteModal}
        onClose={() => setShowEditNoteModal(false)}
        title="Notiz bearbeiten"
      >
        {selectedNote && (
          <NoteForm
            note={selectedNote}
            onSubmit={handleUpdateNote}
            onCancel={() => setShowEditNoteModal(false)}
          />
        )}
      </Modal>

      {/* Löschen Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteNote}
        title="Notiz löschen"
        message="Möchten Sie diese Notiz wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        type="danger"
      />
    </div>
  )
}

interface NoteFormProps {
  note?: Note
  onSubmit: (note: Omit<Note, 'id'>) => void
  onCancel: () => void
}

function NoteForm({ note, onSubmit, onCancel }: NoteFormProps) {
  const [title, setTitle] = useState(note?.title || '')
  const [content, setContent] = useState(note?.content || '')
  const [selectedMonths, setSelectedMonths] = useState<number[]>(
    note?.months.map((m) => m.month) || []
  )

  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      title,
      content,
      isActive: note?.isActive ?? true,
      months: selectedMonths.map((month) => ({ month })),
    })
  }

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month)
        ? prev.filter((m) => m !== month)
        : [...prev, month]
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Titel
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-dark-lighter dark:border-gray-600"
          required
        />
      </div>

      <div>
        <label
          htmlFor="content"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Inhalt
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-dark-lighter dark:border-gray-600"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Monate
        </label>
        <div className="grid grid-cols-3 gap-2">
          {months.map((month) => (
            <label
              key={month}
              className="inline-flex items-center"
            >
              <input
                type="checkbox"
                checked={selectedMonths.includes(month)}
                onChange={() => toggleMonth(month)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {new Date(2000, month - 1).toLocaleString('de-DE', { month: 'long' })}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-dark-lighter dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {note ? 'Aktualisieren' : 'Erstellen'}
        </button>
      </div>
    </form>
  )
} 