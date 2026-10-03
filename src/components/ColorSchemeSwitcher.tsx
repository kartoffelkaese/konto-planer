'use client'

import { useSyncExternalStore } from 'react'
import { ComputerDesktopIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import {
  applyThemeMode,
  getStoredThemeMode,
  THEME_CHANGE_EVENT,
  THEME_MODE_LABELS,
  THEME_MODES,
  type ThemeMode,
} from '@/lib/colorSchemes'
import SegmentedControl from '@/components/SegmentedControl'

const icons: Record<ThemeMode, typeof SunIcon> = {
  light: SunIcon,
  dark: MoonIcon,
  system: ComputerDesktopIcon,
}

function subscribeThemeChange(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export default function ColorSchemeSwitcher() {
  // null beim Server-Rendern: der gespeicherte Modus ist erst im Browser bekannt
  const mode = useSyncExternalStore<ThemeMode | null>(
    subscribeThemeChange,
    getStoredThemeMode,
    () => null
  )

  const handleChange = (next: ThemeMode) => {
    applyThemeMode(next)
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
  }

  return (
    <SegmentedControl
      ariaLabel="Darstellung"
      className="grid w-full max-w-md grid-cols-3"
      buttonClassName="px-1.5"
      value={mode}
      onChange={handleChange}
      disabled={mode === null}
      options={THEME_MODES.map((id) => ({
        value: id,
        label: THEME_MODE_LABELS[id],
        icon: icons[id],
      }))}
    />
  )
}
