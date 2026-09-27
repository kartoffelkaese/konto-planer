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
    <div
      className="grid w-full max-w-md grid-cols-3 gap-1 rounded-pill bg-surface-muted p-1"
      role="radiogroup"
      aria-label="Darstellung"
    >
      {THEME_MODES.map((id) => {
        const Icon = icons[id]
        const selected = mode === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={mode === null}
            onClick={() => handleChange(id)}
            className={`flex min-w-0 min-h-10 items-center justify-center gap-1.5 rounded-pill px-2 text-sm font-medium transition-colors duration-feedback ${
              selected
                ? 'bg-surface text-primary shadow-card'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{THEME_MODE_LABELS[id]}</span>
          </button>
        )
      })}
    </div>
  )
}
