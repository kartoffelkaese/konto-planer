'use client'

/** Gesättigte, schema-unabhängige Palette – gut lesbar mit getContrastColor. */
export const PRESET_COLORS = [
  '#F4A261',
  '#2A9D8F',
  '#457B9D',
  '#A7C7E7',
  '#C0392B',
  '#2E86AB',
  '#1F6B52',
  '#8A6918',
  '#6B4C9A',
  '#D35400',
  '#2C3E50',
  '#16A085',
  '#8E44AD',
  '#2874A6',
  '#A04000',
  '#566573',
] as const

export const DEFAULT_CATEGORY_COLOR = PRESET_COLORS[0]

type ColorPickerProps = {
  value: string
  onChange: (color: string) => void
  id: string
  compact?: boolean
}

export default function ColorPicker({ value, onChange, id, compact = false }: ColorPickerProps) {
  const presets = compact ? PRESET_COLORS.slice(0, 8) : PRESET_COLORS

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className={`grid gap-2 ${compact ? 'grid-cols-8' : 'grid-cols-6'}`}>
        {presets.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Farbe ${color}`}
            className={`rounded-full border-2 transition-colors hover:opacity-90 ${
              compact ? 'h-6 w-6' : 'h-8 w-8'
            } ${
              value === color ? 'border-accent ring-2 ring-accent/30' : 'border-border shadow-sm'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
      {!compact && (
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <input
              type="color"
              id={id}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="sr-only"
            />
            <label
              htmlFor={id}
              className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-primary border border-border rounded-control shadow-sm hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface"
            >
              Andere Farbe wählen
            </label>
          </div>
          <div
            className="h-10 w-10 rounded-full border border-border"
            style={{ backgroundColor: value }}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  )
}

export function pickDefaultCategoryColor(existingColors: (string | null | undefined)[]): string {
  const used = new Set(existingColors.filter(Boolean))
  const unused = PRESET_COLORS.find((color) => !used.has(color))
  return unused ?? PRESET_COLORS[existingColors.length % PRESET_COLORS.length]
}
