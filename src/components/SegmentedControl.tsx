'use client'

import { useLayoutEffect, useRef, type ComponentType, type SVGProps } from 'react'

export type SegmentedOption<T extends string> = {
  value: T
  label: string
  /** Kurzform für schmale Displays (volle Bezeichnung bleibt als aria-label) */
  shortLabel?: string
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  badge?: number
  /** Farbe der Zahl, solange die Option nicht gewählt ist */
  badgeTone?: 'neutral' | 'expense'
}

type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[]
  value: T | null
  onChange: (value: T) => void
  ariaLabel: string
  /** radiogroup = Auswahl eines Werts (Filter), tablist = Wechsel zwischen Bereichen */
  role?: 'radiogroup' | 'tablist'
  /** Layout der Leiste, z. B. `grid w-full grid-cols-3` oder `flex min-w-min` */
  className?: string
  /** Zusätzliche Klassen je Option; ersetzt den Standard-Innenabstand `px-3` */
  buttonClassName?: string
  disabled?: boolean
}

/**
 * Segmentierte Auswahl (Pillen-Leiste) – einheitlich für Zeitraum-Filter, Darstellung und Split-Bereiche.
 * Die helle Markierung gleitet beim Wechsel zur gewählten Option (.segmented-indicator).
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  role = 'radiogroup',
  className = 'grid w-full grid-cols-3',
  buttonClassName = 'px-3',
  disabled = false,
}: SegmentedControlProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const positionedRef = useRef(false)

  // Markierung direkt am DOM ausrichten (kein State): folgt der Auswahl und Größenänderungen
  useLayoutEffect(() => {
    const track = trackRef.current
    const indicator = indicatorRef.current
    if (!track || !indicator) return

    const place = () => {
      const selected = track.querySelector<HTMLElement>('[data-selected="true"]')
      if (!selected) {
        indicator.style.opacity = '0'
        positionedRef.current = false
        return
      }
      // Erste Platzierung ohne Animation, sonst gleitet die Markierung beim Laden von links herein
      if (!positionedRef.current) indicator.style.transition = 'none'
      indicator.style.width = `${selected.offsetWidth}px`
      indicator.style.transform = `translateX(${selected.offsetLeft}px)`
      indicator.style.opacity = '1'
      if (!positionedRef.current) {
        void indicator.offsetWidth
        indicator.style.transition = ''
        positionedRef.current = true
      }
    }

    place()
    const observer = new ResizeObserver(place)
    observer.observe(track)
    track.querySelectorAll('button').forEach((button) => observer.observe(button))
    return () => observer.disconnect()
  }, [value, options])

  const isTabs = role === 'tablist'

  return (
    <div
      ref={trackRef}
      role={role}
      aria-label={ariaLabel}
      className={`relative gap-1 rounded-pill bg-surface-muted p-1 ${className}`}
    >
      <span ref={indicatorRef} className="segmented-indicator" aria-hidden="true" />
      {options.map((option) => {
        const selected = value === option.value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            role={isTabs ? 'tab' : 'radio'}
            aria-selected={isTabs ? selected : undefined}
            aria-checked={isTabs ? undefined : selected}
            aria-label={option.shortLabel ? option.label : undefined}
            data-selected={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`segmented-option relative z-[1] flex min-h-10 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-pill text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              selected ? 'text-primary' : 'text-secondary hover:text-primary'
            } ${buttonClassName}`}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
            {option.shortLabel ? (
              <>
                <span className="truncate sm:hidden" aria-hidden="true">
                  {option.shortLabel}
                </span>
                <span className="max-sm:hidden" aria-hidden="true">
                  {option.label}
                </span>
              </>
            ) : (
              <span className="truncate">{option.label}</span>
            )}
            {option.badge != null && option.badge > 0 && (
              <span
                className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors duration-feedback ${
                  selected
                    ? 'bg-accent text-accent-foreground'
                    : option.badgeTone === 'expense'
                      ? 'bg-expense-bg text-expense'
                      : 'bg-surface text-secondary'
                }`}
              >
                {option.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
