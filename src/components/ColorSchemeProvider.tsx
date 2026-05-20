'use client'

import { useEffect } from 'react'
import { applyColorScheme, getStoredColorScheme } from '@/lib/colorSchemes'

export function ColorSchemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyColorScheme(getStoredColorScheme())
  }, [])

  return <>{children}</>
}
