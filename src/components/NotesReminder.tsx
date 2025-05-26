'use client'

import { useState, useEffect } from 'react'
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/hooks/useToast'

interface Note {
  id: number
  title: string
  content: string
  months: { id: number; month: number }[]
}

export default function NotesReminder() {
  const [notes, setNotes] = useState<Note[]>([])
  const [isOpen, setIsOpen] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    fetchActiveNotes()
  }, [])

  const fetchActiveNotes = async () => {
    try {
      const response = await fetch('/api/notes')
      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }
      const allNotes = await response.json()
      
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1
      const currentYear = currentDate.getFullYear()

      // Filtere Notizen für den aktuellen Monat
      const activeNotes = allNotes.filter((note: Note) =>
        note.months.some((m) => m.month === currentMonth)
      )

      // Prüfe, ob die Notizen bereits als gelesen markiert wurden
      const unreadNotesPromises = activeNotes.map(async (note: Note) => {
        try {
          const readResponse = await fetch(
            `/api/notes/read?noteId=${note.id}&year=${currentYear}&month=${currentMonth}`
          )
          if (!readResponse.ok) {
            const error = await readResponse.text()
            console.error('Error checking read status:', error)
            return note // Bei Fehler zeigen wir die Notiz trotzdem an
          }
          const readStatus = await readResponse.json()
          return readStatus.isRead ? null : note
        } catch (error) {
          console.error('Error checking read status:', error)
          return note // Bei Fehler zeigen wir die Notiz trotzdem an
        }
      })

      const unreadNotes = await Promise.all(unreadNotesPromises)
      setNotes(unreadNotes.filter(Boolean))
    } catch (error) {
      console.error('Error fetching active notes:', error)
      showToast('Fehler beim Laden der Notizen', 'error')
      setNotes([]) // Bei Fehler zeigen wir keine Notizen an
    }
  }

  const handleMarkAsRead = async (noteId: number) => {
    try {
      const currentDate = new Date()
      const response = await fetch('/api/notes/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId,
          year: currentDate.getFullYear(),
          month: currentDate.getMonth() + 1,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }

      await response.json()
      setNotes((prev) => prev.filter((note) => note.id !== noteId))
      showToast('Notiz als gelesen markiert', 'success')
    } catch (error) {
      console.error('Error marking note as read:', error)
      showToast('Fehler beim Markieren der Notiz', 'error')
    }
  }

  if (notes.length === 0 || !isOpen) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-white dark:bg-dark-light rounded-lg shadow-lg border border-gray-200 dark:border-dark-lighter">
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <BellIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h3 className="ml-2 text-lg font-medium text-gray-900 dark:text-white">
                Erinnerungen
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4"
              >
                <h4 className="font-medium text-blue-900 dark:text-blue-200">
                  {note.title}
                </h4>
                <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
                  {note.content}
                </p>
                <button
                  onClick={() => handleMarkAsRead(note.id)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Als gelesen markieren
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 