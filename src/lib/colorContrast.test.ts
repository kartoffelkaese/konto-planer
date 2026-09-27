import { describe, it, expect } from 'vitest'
import { COLOR_SCHEME_TOKENS } from './colorSchemeTokens'
import { normalizeThemeMode } from './colorSchemes'
import {
  contrastRatio,
  meetsContrast,
  WCAG_AA_LARGE_UI,
  WCAG_AA_NORMAL_TEXT,
} from './colorContrast'

describe('color scheme contrast (WCAG AA)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    describe(scheme, () => {
      const t = COLOR_SCHEME_TOKENS[scheme]

      it('primary text on canvas', () => {
        expect(meetsContrast(t.textPrimary, t.canvas, WCAG_AA_NORMAL_TEXT)).toBe(
          true
        )
      })

      it('secondary text on canvas', () => {
        expect(
          meetsContrast(t.textSecondary, t.canvas, WCAG_AA_NORMAL_TEXT)
        ).toBe(true)
      })

      it('accent foreground on accent', () => {
        expect(
          meetsContrast(t.accentForeground, t.accent, WCAG_AA_NORMAL_TEXT)
        ).toBe(true)
      })

      it('income on income background', () => {
        expect(meetsContrast(t.income, t.incomeBg, WCAG_AA_NORMAL_TEXT)).toBe(
          true
        )
      })

      it('expense on expense background', () => {
        expect(meetsContrast(t.expense, t.expenseBg, WCAG_AA_NORMAL_TEXT)).toBe(
          true
        )
      })

      it('pending on pending background', () => {
        expect(meetsContrast(t.pending, t.pendingBg, WCAG_AA_NORMAL_TEXT)).toBe(
          true
        )
      })

      it('danger foreground on danger', () => {
        expect(
          meetsContrast(t.dangerForeground, t.danger, WCAG_AA_NORMAL_TEXT)
        ).toBe(true)
      })

      it('danger on danger subtle background', () => {
        expect(
          meetsContrast(t.danger, t.dangerSubtle, WCAG_AA_NORMAL_TEXT)
        ).toBe(true)
      })

      it('border on surface (UI components)', () => {
        expect(meetsContrast(t.border, t.surface, WCAG_AA_LARGE_UI)).toBe(true)
      })

      it('border on surface-muted (UI components)', () => {
        expect(meetsContrast(t.border, t.surfaceMuted, WCAG_AA_LARGE_UI)).toBe(true)
      })

      it('secondary text on surface-muted', () => {
        expect(
          meetsContrast(t.textSecondary, t.surfaceMuted, WCAG_AA_NORMAL_TEXT)
        ).toBe(true)
      })

      it('accent on surface and accent-subtle', () => {
        expect(meetsContrast(t.accent, t.surface, WCAG_AA_NORMAL_TEXT)).toBe(true)
        expect(meetsContrast(t.accent, t.accentSubtle, WCAG_AA_NORMAL_TEXT)).toBe(true)
      })

      it('semantic amounts on surface', () => {
        for (const c of [t.income, t.expense, t.pending]) {
          expect(meetsContrast(c, t.surface, WCAG_AA_NORMAL_TEXT)).toBe(true)
        }
      })

      it('expense differs from danger', () => {
        expect(t.expense).not.toBe(t.danger)
      })

      it('canvas and accent-muted are distinct', () => {
        expect(t.canvas).not.toBe(t.accentMuted)
      })
    })
  }

  it('reports contrast ratios for debugging', () => {
    const light = COLOR_SCHEME_TOKENS.light
    expect(contrastRatio(light.textPrimary, light.canvas)).toBeGreaterThan(10)
  })
})

describe('theme mode migration', () => {
  it('keeps valid modes', () => {
    expect(normalizeThemeMode('light')).toBe('light')
    expect(normalizeThemeMode('dark')).toBe('dark')
    expect(normalizeThemeMode('system')).toBe('system')
  })

  it('maps legacy dark schemes to dark', () => {
    expect(normalizeThemeMode('plum')).toBe('dark')
    expect(normalizeThemeMode('heritage')).toBe('dark')
  })

  it('maps legacy light schemes and unknown values to system', () => {
    expect(normalizeThemeMode('kupfer')).toBe('system')
    expect(normalizeThemeMode('nebel')).toBe('system')
    expect(normalizeThemeMode(null)).toBe('system')
    expect(normalizeThemeMode('foo')).toBe('system')
  })
})
