'use client'

import { SessionProvider } from 'next-auth/react'
import { ColorSchemeProvider } from '@/components/ColorSchemeProvider'
import { ToastProvider } from '@/contexts/ToastContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ColorSchemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ColorSchemeProvider>
    </SessionProvider>
  )
}
