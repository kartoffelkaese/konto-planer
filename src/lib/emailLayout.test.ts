import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { renderEmail, type EmailContent } from '@/lib/emailLayout'
import { LEGAL_PAGES } from '@/lib/legalPages'
import {
  alreadyRegisteredEmail,
  cancellationConfirmationEmail,
  cancellationLinkEmail,
  emailChangeVerificationEmail,
  passwordResetEmail,
  signupVerificationEmail,
} from '@/lib/emailTemplates'

const base: EmailContent = {
  subject: 'Betreff',
  preheader: 'Vorschau',
  title: 'Titel',
  paragraphs: ['erster Absatz'],
  footerNote: 'Darum kommt diese E-Mail.',
}

describe('renderEmail', () => {
  const previousUrl = process.env.AUTH_URL
  beforeEach(() => {
    process.env.AUTH_URL = 'https://app.test'
  })
  afterEach(() => {
    process.env.AUTH_URL = previousUrl
  })

  it('maskiert alle Inhalte im HTML, lässt die Text-Fassung unverändert', () => {
    const mail = renderEmail({
      ...base,
      title: '<b>Titel</b>',
      paragraphs: ['a & b <script>'],
      button: { label: 'Los "jetzt"', url: 'https://app.test/x?a=1&b=2' },
    }, [])
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).toContain('a &amp; b &lt;script&gt;')
    expect(mail.html).toContain('&lt;b&gt;Titel&lt;/b&gt;')
    expect(mail.html).toContain('href="https://app.test/x?a=1&amp;b=2"')
    expect(mail.html).toContain('Los &quot;jetzt&quot;')
    expect(mail.text).toContain('a & b <script>')
    expect(mail.text).toContain('https://app.test/x?a=1&b=2')
  })

  it('zeigt den Knopf und darunter den Link als Text', () => {
    const mail = renderEmail({ ...base, button: { label: 'Bestätigen', url: 'https://app.test/ok' } }, [])
    expect(mail.html.match(/href="https:\/\/app\.test\/ok"/g)).toHaveLength(2)
    expect(mail.html).toContain('Falls der Knopf nicht funktioniert')
    expect(mail.text).toContain('Bestätigen:\nhttps://app.test/ok')
  })

  it('ohne Knopf kein Ersatz-Link', () => {
    const mail = renderEmail(base, [])
    expect(mail.html).not.toContain('Falls der Knopf nicht funktioniert')
  })

  it('enthält Vorschauzeile, Anrede und Fußzeile in beiden Fassungen', () => {
    const mail = renderEmail(base, [])
    expect(mail.html).toContain('Vorschau</div>')
    expect(mail.html).toContain('Hallo,')
    expect(mail.text.startsWith('Hallo,\n\nerster Absatz')).toBe(true)
    expect(mail.html).toContain('Darum kommt diese E-Mail.')
    expect(mail.text).toContain('Darum kommt diese E-Mail.')
  })

  it('verweist auf vorhandene Rechtstexte mit absoluter Adresse', () => {
    const mail = renderEmail(base, LEGAL_PAGES.slice(0, 2))
    expect(mail.html).toContain('href="https://app.test/impressum"')
    expect(mail.html).toContain('href="https://app.test/datenschutz"')
    expect(mail.html).not.toContain('/agb')
    expect(mail.text).toContain('Impressum: https://app.test/impressum\nDatenschutz: https://app.test/datenschutz')
  })

  it('ohne Rechtstexte keine Verweise', () => {
    const mail = renderEmail(base, [])
    expect(mail.html).not.toContain('/impressum')
    expect(mail.text).not.toContain('Impressum')
  })
})

describe('E-Mail-Inhalte', () => {
  const url = 'https://app.test/link?token=abc'
  const cases = [
    ['Registrierung', signupVerificationEmail(url), 'Bitte bestätige deine E-Mail-Adresse', 'vielen Dank für deine Registrierung', url],
    ['Neue Adresse', emailChangeVerificationEmail(url), 'Neue E-Mail-Adresse bestätigen', 'bitte bestätige deine neue E-Mail-Adresse', url],
    ['Passwort', passwordResetEmail(url), 'Passwort zurücksetzen', 'Der Link ist 1 Stunde gültig', url],
    ['Bereits registriert', alreadyRegisteredEmail('https://app.test'), 'Du hast bereits ein Konto', 'Du hast bereits eines.', 'https://app.test/auth/forgot-password'],
    ['Kündigungslink', cancellationLinkEmail(url), 'Kündigung bestätigen', 'wurde die Kündigung des Abos', url],
    ['Kündigung', cancellationConfirmationEmail(new Date('2026-11-30T12:00:00Z'), new Date('2026-10-17T12:00:00Z')), 'Bestätigung deiner Kündigung', 'Das Abo endet zum 30.11.2026', 'eingegangen am 17.10.2026'],
  ] as const

  it.each(cases)('%s: Betreff, Kernsatz und Link', (_name, mail, subject, core, extra) => {
    expect(mail.subject).toContain(subject)
    expect(mail.subject).toContain('KontoPlaner')
    expect(mail.text).toContain(core)
    expect(mail.text).toContain(extra)
    expect(mail.html).toContain('<!doctype html>')
  })
})
