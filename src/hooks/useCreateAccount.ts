'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/useToast'

export function useCreateAccount() {
  const router = useRouter()
  const { update } = useSession()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)

  const createAccount = useCallback(
    async (name: string, options?: { switchToNew?: boolean }) => {
      const trimmed = name.trim()
      if (!trimmed) {
        showToast('Bitte einen Kontonamen eingeben', 'error')
        return false
      }

      setLoading(true)
      try {
        const res = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed }),
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(
            typeof data.error === 'string' ? data.error : 'Anlegen fehlgeschlagen'
          )
        }

        if (options?.switchToNew !== false) {
          const switchRes = await fetch('/api/accounts/active', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: data.id }),
          })
          if (switchRes.ok) {
            await update({ activeAccountId: data.id })
          }
        }

        router.refresh()
        window.dispatchEvent(new Event('account-changed'))
        showToast('Konto angelegt', 'success')
        return true
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Konto konnte nicht angelegt werden',
          'error'
        )
        return false
      } finally {
        setLoading(false)
      }
    },
    [router, update, showToast]
  )

  return { createAccount, loading }
}
