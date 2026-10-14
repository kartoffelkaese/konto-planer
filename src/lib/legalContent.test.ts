import { describe, expect, it } from 'vitest'
import { parseLegalText } from './legalContent'
import { isLegalPath } from './legalPages'

describe('parseLegalText', () => {
  it('erkennt Überschriften, Absätze und Listen', () => {
    const blocks = parseLegalText(
      ['# Impressum', '', 'Max Muster', 'Musterweg 1', '', '## Kontakt', '- E-Mail: a@b.de', '- Telefon: 123', 'Danach ein Absatz.'].join('\n')
    )
    expect(blocks).toEqual([
      { type: 'heading', level: 1, text: 'Impressum' },
      { type: 'paragraph', lines: ['Max Muster', 'Musterweg 1'] },
      { type: 'heading', level: 2, text: 'Kontakt' },
      { type: 'list', items: ['E-Mail: a@b.de', 'Telefon: 123'] },
      { type: 'paragraph', lines: ['Danach ein Absatz.'] },
    ])
  })

  it('lässt HTML als Text stehen und kommt mit Windows-Zeilenenden zurecht', () => {
    expect(parseLegalText('<b>fett</b>\r\n\r\nzweiter')).toEqual([
      { type: 'paragraph', lines: ['<b>fett</b>'] },
      { type: 'paragraph', lines: ['zweiter'] },
    ])
  })
})

describe('isLegalPath', () => {
  it('kennt genau die vier Seiten', () => {
    expect(isLegalPath('/impressum')).toBe(true)
    expect(isLegalPath('/widerruf')).toBe(true)
    expect(isLegalPath('/impressum/x')).toBe(false)
    expect(isLegalPath('/settings')).toBe(false)
  })
})
