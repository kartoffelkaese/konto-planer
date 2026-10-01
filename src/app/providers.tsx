'use client'

import { SessionProvider } from 'next-auth/react'
import { ColorSchemeProvider } from '@/components/ColorSchemeProvider'
import { ToastProvider } from '@/contexts/ToastContext'
import { PendingUndoProvider } from '@/contexts/PendingUndoContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ColorSchemeProvider>
        <ToastProvider>
          <PendingUndoProvider>{children}</PendingUndoProvider>
        </ToastProvider>
      </ColorSchemeProvider>
    </SessionProvider>
  )
}
