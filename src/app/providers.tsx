'use client'

import { SessionProvider } from 'next-auth/react'
import { ColorSchemeProvider } from '@/components/ColorSchemeProvider'
import { ToastProvider } from '@/contexts/ToastContext'
import { PendingUndoProvider } from '@/contexts/PendingUndoContext'
import { UserSettingsProvider } from '@/hooks/useUserSettings'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UserSettingsProvider>
        <ColorSchemeProvider>
          <ToastProvider>
            <PendingUndoProvider>{children}</PendingUndoProvider>
          </ToastProvider>
        </ColorSchemeProvider>
      </UserSettingsProvider>
    </SessionProvider>
  )
}
