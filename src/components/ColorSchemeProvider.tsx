'use client'

import { useEffect } from 'react'
import {
  applyResolvedTheme,
  getStoredThemeMode,
  THEME_CHANGE_EVENT,
} from '@/lib/colorSchemes'

/** Hält die `dark`-Klasse synchron – auch bei Systemwechsel im Modus „System“. */
export function ColorSchemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const sync = () => applyResolvedTheme(getStoredThemeMode())
    sync()

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', sync)
    window.addEventListener(THEME_CHANGE_EVENT, sync)
    return () => {
      media.removeEventListener('change', sync)
      window.removeEventListener(THEME_CHANGE_EVENT, sync)
    }
  }, [])

  return <>{children}</>
}
