'use client'

import { useEffect, useState } from 'react'
import {
  applyColorScheme,
  COLOR_SCHEME_LABELS,
  COLOR_SCHEMES,
  getStoredColorScheme,
  type ColorScheme,
} from '@/lib/colorSchemes'

export default function ColorSchemeSwitcher() {
  const [mounted, setMounted] = useState(false)
  const [scheme, setScheme] = useState<ColorScheme>('nebel')

  useEffect(() => {
    setMounted(true)
    setScheme(getStoredColorScheme())
  }, [])

  const handleChange = (next: ColorScheme) => {
    setScheme(next)
    applyColorScheme(next)
  }

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl">
        {COLOR_SCHEMES.map((id) => (
          <div key={id} className="h-20 rounded-card bg-surface-muted animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl" role="radiogroup" aria-label="Farbschema">
      {COLOR_SCHEMES.map((id) => {
        const { title, description, swatches } = COLOR_SCHEME_LABELS[id]
        const selected = scheme === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => handleChange(id)}
            className={`flex flex-col gap-2 rounded-card border p-3 text-left transition-colors duration-feedback ${
              selected
                ? 'border-accent bg-accent-subtle ring-2 ring-accent/25'
                : 'border-border bg-surface hover:bg-surface-muted'
            }`}
          >
            <div className="flex gap-1" aria-hidden>
              {swatches.map((color) => (
                <span
                  key={color}
                  className="h-6 flex-1 rounded-md border border-border shadow-sm first:rounded-l-lg last:rounded-r-lg"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span>
              <span className="block text-sm font-medium text-primary">{title}</span>
              <span className="block text-xs text-secondary mt-0.5">{description}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
