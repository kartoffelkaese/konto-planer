'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { AccountMemberRole } from '@prisma/client'
import { isAccountWritable } from '@/lib/accountPermissions'

export type UserSettings = {
  id: string
  email: string
  salaryDay: number
  accountName: string | null
  transferSenderName?: string | null
  createdAt: string
  activeAccountId?: string
  role?: AccountMemberRole
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

  const role = settings?.role
  const canWrite = useMemo(
    () => (role ? isAccountWritable(role) : true),
    [role]
  )

  return {
    settings,
    role,
    canWrite,
    salaryDay: settings?.salaryDay ?? null,
    accountName: settings?.accountName ?? 'Mein Konto',
    loading,
    error,
    reload: load,
  }
}
