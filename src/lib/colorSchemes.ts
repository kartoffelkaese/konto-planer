export const THEME_MODES = ['light', 'dark', 'system'] as const
export type ThemeMode = (typeof THEME_MODES)[number]
export type ResolvedTheme = Exclude<ThemeMode, 'system'>

export const DEFAULT_THEME_MODE: ThemeMode = 'system'
export const COLOR_SCHEME_STORAGE_KEY = 'colorScheme'

/** Frühere Farbschemata (bis 8.7) → neuer Modus */
const LEGACY_DARK_SCHEMES = ['plum', 'heritage']
const LEGACY_SCHEMES = ['nebel', 'kupfer', 'moor', 'lagoon', 'ocean', 'forest', 'twilight']

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  light: 'Hell',
  dark: 'Dunkel',
  system: 'System',
}

export function normalizeThemeMode(value: string | null): ThemeMode {
  if (value && (THEME_MODES as readonly string[]).includes(value)) {
    return value as ThemeMode
  }
  if (value && LEGACY_DARK_SCHEMES.includes(value)) return 'dark'
  if (value && LEGACY_SCHEMES.includes(value)) return 'system'
  return DEFAULT_THEME_MODE
}

/** Inline-Script gegen Aufflackern (FOUC) in layout.tsx — spiegelt normalizeThemeMode/resolveTheme. */
export const THEME_INIT_SCRIPT = `(function(){try{var k='${COLOR_SCHEME_STORAGE_KEY}';var s=localStorage.getItem(k);var m=${JSON.stringify(
  THEME_MODES
)}.indexOf(s)>=0?s:(${JSON.stringify(LEGACY_DARK_SCHEMES)}.indexOf(s)>=0?'dark':'${DEFAULT_THEME_MODE}');if(s!==m)localStorage.setItem(k,m);var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.removeAttribute('data-color-scheme');}catch(_){}})();`

export function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return mode
}

export function applyResolvedTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', resolveTheme(mode) === 'dark')
}

export function applyThemeMode(mode: ThemeMode) {
  applyResolvedTheme(mode)
  try {
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, mode)
  } catch {
    // Speicher nicht verfügbar – Modus gilt nur für diese Sitzung
  }
}

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return DEFAULT_THEME_MODE
  try {
    const stored = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)
    const mode = normalizeThemeMode(stored)
    if (stored !== mode) localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, mode)
    return mode
  } catch {
    return DEFAULT_THEME_MODE
  }
}

export const THEME_CHANGE_EVENT = 'konto-planer:theme-change'
