'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/useToast'
import {
  dispatchAccountChanged,
  dispatchAccountSwitching,
  ACCOUNT_SWITCH_EXIT_MS,
} from '@/lib/accountSwitchEvents'
import {
  ApiError,
  createAccount as createAccountRequest,
  setActiveAccount,
  withApiErrorFallback,
} from '@/lib/api'

export function useCreateAccount() {
  const router = useRouter()
  const { update } = useSession()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)

  const createAccount = useCallback(
    async (
      name: string,
      options?: { switchToNew?: boolean; bankId?: string | null; isSimpleAccount?: boolean }
    ) => {
      const trimmed = name.trim()
      if (!trimmed) {
        showToast('Bitte einen Kontonamen eingeben', 'error')
        return false
      }

      setLoading(true)
      try {
        const data = await withApiErrorFallback(
          createAccountRequest({
            name: trimmed,
            ...(options?.bankId ? { bankId: options.bankId } : {}),
            ...(options?.isSimpleAccount ? { isSimpleAccount: true } : {}),
          }),
          'Anlegen fehlgeschlagen'
        )

        if (options?.switchToNew !== false) {
          dispatchAccountSwitching()
          await new Promise((resolve) => setTimeout(resolve, ACCOUNT_SWITCH_EXIT_MS))
          // Fehlerantwort still übergehen (wie bisher), Netzwerkfehler weiterreichen
          const switched = await setActiveAccount(data.id).then(
            () => true,
            (err) => {
              if (err instanceof ApiError) return false
              throw err
            }
          )
          if (switched) {
            await update({ activeAccountId: data.id })
          }
        }

        router.refresh()
        dispatchAccountChanged()
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
