export const COLOR_SCHEMES = ['nebel', 'twilight'] as const
export type ColorScheme = (typeof COLOR_SCHEMES)[number]

export const DEFAULT_COLOR_SCHEME: ColorScheme = 'nebel'
export const COLOR_SCHEME_STORAGE_KEY = 'colorScheme'

export const COLOR_SCHEME_LABELS: Record<
  ColorScheme,
  { title: string; description: string; swatches: string[] }
> = {
  nebel: {
    title: 'Nebel & Veilchen',
    description: 'Standard – kühl, Periwinkle-Akzent',
    swatches: ['#f3f2f8', '#5e6ad2', '#3a8f6e', '#c4695a'],
  },
  twilight: {
    title: 'Abendlicht',
    description: 'Creme, Schiefer & Taupe',
    swatches: ['#f2e9e4', '#4a4e69', '#4a7c59', '#8b6b73'],
  },
}

export function applyColorScheme(scheme: ColorScheme) {
  document.documentElement.setAttribute('data-color-scheme', scheme)
  localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, scheme)
}

export function getStoredColorScheme(): ColorScheme {
  if (typeof window === 'undefined') return DEFAULT_COLOR_SCHEME
  const stored = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY) as ColorScheme | null
  return stored && COLOR_SCHEMES.includes(stored) ? stored : DEFAULT_COLOR_SCHEME
}
