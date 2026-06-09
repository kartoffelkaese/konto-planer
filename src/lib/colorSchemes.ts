export const COLOR_SCHEMES = [
  'nebel',
  'kupfer',
  'moor',
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
    description: 'Kühles Indigo-UI, Teal & Ziegel für Werte',
    swatches: ['#1a1b26', '#4455a8', '#1f6b52', '#826016', '#a83832'],
  },
  kupfer: {
    title: 'Kupfer & Kreide',
    description: 'Warmes Kupfer-UI, Grün & Ziegel',
    swatches: ['#2a221e', '#8a4e2a', '#256b50', '#826018', '#9a3830'],
  },
  moor: {
    title: 'Moor & Torf',
    description: 'Erdiges Petrol-UI, Moos & Ziegel',
    swatches: ['#141c18', '#2a5856', '#236b44', '#826016', '#a83830'],
  },
  plum: {
    title: 'Nachtviolett',
    description: 'Dunkelmodus – Pflaume, Mint & Beere',
    swatches: ['#0a0909', '#a87898', '#5ec492', '#c8a0d8', '#e07898'],
  },
  lagoon: {
    title: 'Lagune',
    description: 'Aquatisches Cyan, Amber & Koralle',
    swatches: ['#001219', '#006d9e', '#0a7068', '#8a5208', '#9b2226'],
  },
  heritage: {
    title: 'Heritage',
    description: 'Dunkelmodus – Marine, Mint & Amber',
    swatches: ['#001820', '#5a94b8', '#60c890', '#d8a850', '#ec5868'],
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
  if (stored === 'forest') {
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'kupfer')
    return 'kupfer'
  }
  if (stored === 'twilight') {
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, DEFAULT_COLOR_SCHEME)
    return DEFAULT_COLOR_SCHEME
  }
  return stored && COLOR_SCHEMES.includes(stored as ColorScheme)
    ? (stored as ColorScheme)
    : DEFAULT_COLOR_SCHEME
}
