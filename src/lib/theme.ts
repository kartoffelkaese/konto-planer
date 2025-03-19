export type Theme = 'light' | 'dark' | 'system'

export const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const getStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'system'
  return (localStorage.getItem('theme') as Theme) || 'system'
}

export const setStoredTheme = (theme: Theme) => {
  if (typeof window === 'undefined') return
  localStorage.setItem('theme', theme)
}

export const applyTheme = (theme: Theme) => {
  if (typeof window === 'undefined') return

  const root = window.document.documentElement
  const systemTheme = getSystemTheme()

  if (theme === 'system') {
    root.classList.remove('light', 'dark')
    root.classList.add(systemTheme)
  } else {
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }
} 