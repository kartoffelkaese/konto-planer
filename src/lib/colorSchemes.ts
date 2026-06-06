export const COLOR_SCHEMES = [
  'nebel',
  'twilight',
  'forest',
  'plum',
  'lagoon',
  'heritage',
] as const
export type ColorScheme = (typeof COLOR_SCHEMES)[number]

export const DEFAULT_COLOR_SCHEME: ColorScheme = 'nebel'
export const COLOR_SCHEME_STORAGE_KEY = 'colorScheme'

/** Für FOUC-Script in layout.tsx */
export const COLOR_SCHEMES_JSON = JSON.stringify(COLOR_SCHEMES)

export const DARK_COLOR_SCHEMES = ['plum', 'heritage'] as const

export const DARK_COLOR_SCHEMES_JSON = JSON.stringify(DARK_COLOR_SCHEMES)

export const COLOR_SCHEME_LABELS: Record<
  ColorScheme,
  { title: string; description: string; swatches: string[] }
> = {
  nebel: {
    title: 'Nebel & Veilchen',
    description: 'Violett-UI, Grün & Rost für Werte',
    swatches: ['#1c1b28', '#4e58b8', '#2f7a5c', '#9a7d2e', '#b85a4c'],
  },
  twilight: {
    title: 'Abendlicht',
    description: 'Schiefer-UI, Salbei, Mauve & warmes Taupe',
    swatches: ['#22223b', '#4a4e69', '#2f5639', '#6b5436', '#5a3d46'],
  },
  forest: {
    title: 'Moos & Teal',
    description: 'Warmes Moos & Salbei – erdig, ohne Blau',
    swatches: ['#c9e4ca', '#87bba2', '#55828b', '#6b7d52', '#7a5c48'],
  },
  plum: {
    title: 'Nachtviolett',
    description: 'Dunkelmodus – Pflaume, Mint, Lilac & Beere',
    swatches: ['#050404', '#4a1942', '#6ecf9a', '#d4b0e0', '#e88aaa'],
  },
  lagoon: {
    title: 'Lagune',
    description: 'Aquatisches Cyan – kühl, Amber & Koralle',
    swatches: ['#001219', '#0077b6', '#94d2bd', '#ca6702', '#9b2226'],
  },
  heritage: {
    title: 'Heritage',
    description: 'Dunkelmodus – Marine-UI, Mint, Amber & Koralle',
    swatches: ['#001a28', '#669bbc', '#6ecf9a', '#e0b060', '#c1121f'],
  },
}

export function isDarkColorScheme(scheme: ColorScheme): boolean {
  return (DARK_COLOR_SCHEMES as readonly string[]).includes(scheme)
}

export function applyColorScheme(scheme: ColorScheme) {
  document.documentElement.setAttribute('data-color-scheme', scheme)
  document.documentElement.classList.toggle('dark', isDarkColorScheme(scheme))
  localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, scheme)
}

export function getStoredColorScheme(): ColorScheme {
  if (typeof window === 'undefined') return DEFAULT_COLOR_SCHEME
  const stored = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY) as string | null
  if (stored === 'ocean') {
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'lagoon')
    return 'lagoon'
  }
  return stored && COLOR_SCHEMES.includes(stored as ColorScheme)
    ? (stored as ColorScheme)
    : DEFAULT_COLOR_SCHEME
}
