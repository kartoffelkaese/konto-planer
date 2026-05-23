'use client'

import { useState, useEffect, useCallback } from 'react'

export type UserSettings = {
  id: string
  email: string
  salaryDay: number
  accountName: string | null
  createdAt: string
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/users/settings')
      if (!response.ok) {
        throw new Error('Einstellungen konnten nicht geladen werden')
      }
      const data = (await response.json()) as UserSettings
      setSettings(data)
    } catch (err) {
      console.error('Error loading user settings:', err)
      setError('Einstellungen konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onAccountChanged = () => {
      load()
    }
    window.addEventListener('account-changed', onAccountChanged)
    return () => window.removeEventListener('account-changed', onAccountChanged)
  }, [load])

  return {
    settings,
    salaryDay: settings?.salaryDay ?? null,
    accountName: settings?.accountName ?? 'Mein Konto',
    loading,
    error,
    reload: load,
  }
}
