'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import type { AccountMemberRole } from '@prisma/client'
import { isAccountWritable } from '@/lib/accountPermissions'
import { ApiError, getUserSettings } from '@/lib/api'

export type UserSettings = {
  id: string
  email: string
  salaryDay: number
  accountName: string | null
  transferSenderName?: string | null
  splitDisplayName?: string | null
  bankId?: string | null
  isSimpleAccount?: boolean
  createdAt: string
  activeAccountId?: string
  role?: AccountMemberRole
  pendingEmail?: string | null
}

export function useUserSettings() {
  const { data: session, status } = useSession()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (status === 'loading') {
      return
    }

    if (!session?.user) {
      setSettings(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      let data: UserSettings
      try {
        data = await getUserSettings()
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setSettings(null)
          return
        }
        throw err
      }
      setSettings(data)
    } catch (err) {
      console.error('Error loading user settings:', err)
      setError('Einstellungen konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [session, status])

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
    isSimpleAccount: settings?.isSimpleAccount ?? false,
    loading,
    error,
    reload: load,
  }
}
