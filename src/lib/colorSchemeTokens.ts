import type { ResolvedTheme } from '@/lib/colorSchemes'

export type SchemeTokens = {
  canvas: string
  surface: string
  surfaceMuted: string
  surfaceRaised: string
  border: string
  hairline: string
  textPrimary: string
  textSecondary: string
  accent: string
  accentHover: string
  accentSubtle: string
  accentMuted: string
  accentForeground: string
  accentBorder: string
  income: string
  incomeBg: string
  expense: string
  expenseBg: string
  pending: string
  pendingBg: string
  pendingForeground: string
  danger: string
  dangerHover: string
  dangerForeground: string
  dangerSubtle: string
  chartDefault: string
}

/** Single source of truth für die Palette (gespiegelt in globals.css). */
export const COLOR_SCHEME_TOKENS: Record<ResolvedTheme, SchemeTokens> = {
  light: {
    canvas: '#f5f6f8',
    surface: '#ffffff',
    surfaceMuted: '#eef0f4',
    surfaceRaised: '#ffffff',
    border: '#7e8396',
    hairline: '#e6e8ee',
    textPrimary: '#12141a',
    textSecondary: '#5b6070',
    accent: '#4f46e5',
    accentHover: '#4338ca',
    accentSubtle: '#eef0ff',
    accentMuted: '#f4f5fd',
    accentForeground: '#ffffff',
    accentBorder: '#a5a1f5',
    income: '#0f7a52',
    incomeBg: '#e3f5ec',
    expense: '#c2362f',
    expenseBg: '#fdecea',
    pending: '#8a5c00',
    pendingBg: '#fdf3d6',
    pendingForeground: '#ffffff',
    danger: '#b42318',
    dangerHover: '#912018',
    dangerForeground: '#ffffff',
    dangerSubtle: '#fee4e2',
    chartDefault: '#4f46e5',
  },
  dark: {
    canvas: '#0b0d12',
    surface: '#151821',
    surfaceMuted: '#1e222d',
    surfaceRaised: '#1b1f2a',
    border: '#6f7689',
    hairline: '#262b37',
    textPrimary: '#eef0f5',
    textSecondary: '#9aa1b2',
    accent: '#8b87ff',
    accentHover: '#a5a2ff',
    accentSubtle: '#1f2040',
    accentMuted: '#171a2a',
    accentForeground: '#0b0d12',
    accentBorder: '#5b57c9',
    income: '#4ade9a',
    incomeBg: '#0f2a1f',
    expense: '#ff7a72',
    expenseBg: '#321514',
    pending: '#f5c451',
    pendingBg: '#2e2510',
    pendingForeground: '#0b0d12',
    danger: '#ff6b61',
    dangerHover: '#ff8a82',
    dangerForeground: '#0b0d12',
    dangerSubtle: '#3a1614',
    chartDefault: '#8b87ff',
  },
}
