'use client'

import { useEffect, useState } from 'react'
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

export default function ColorSchemeSwitcher() {
  const [mode, setMode] = useState<ThemeMode | null>(null)

  useEffect(() => {
    setMode(getStoredThemeMode())
  }, [])

  const handleChange = (next: ThemeMode) => {
    setMode(next)
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
