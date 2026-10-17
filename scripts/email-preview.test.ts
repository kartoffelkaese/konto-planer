/**
 * Vorschau aller E-Mails ohne Versand: `npm run email:preview`
 *
 * Schreibt jede E-Mail als HTML- und Text-Datei nach `.email-preview/` (nicht im Repo) und
 * eine Übersicht `index.html`. Läuft über Vitest, damit die Pfade mit `@/` aufgelöst werden.
 * Verweise auf Rechtstexte erscheinen, wenn `NEXT_PUBLIC_LEGAL_PAGES` gesetzt ist, z. B.
 * `NEXT_PUBLIC_LEGAL_PAGES=impressum,datenschutz npm run email:preview`.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { it } from 'vitest'
import { escapeHtml, type RenderedEmail } from '@/lib/emailLayout'
import {
  alreadyRegisteredEmail,
  cancellationConfirmationEmail,
  cancellationLinkEmail,
  emailChangeVerificationEmail,
  passwordResetEmail,
  signupVerificationEmail,
} from '@/lib/emailTemplates'

it('schreibt die E-Mail-Vorschau', () => {
  const baseUrl = (process.env.AUTH_URL || 'https://kontoplaner.example').replace(/\/$/, '')
  process.env.AUTH_URL = baseUrl
  const token = 'a'.repeat(64)
  const endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const emails: Array<[string, RenderedEmail]> = [
    ['registrierung', signupVerificationEmail(`${baseUrl}/auth/verify-email?token=${token}`)],
    ['neue-adresse', emailChangeVerificationEmail(`${baseUrl}/auth/verify-email?token=${token}`)],
    ['passwort', passwordResetEmail(`${baseUrl}/auth/reset-password?token=${token}`)],
    ['bereits-registriert', alreadyRegisteredEmail(baseUrl)],
    ['kuendigung-link', cancellationLinkEmail(`${baseUrl}/kuendigen/bestaetigen?token=${token}`)],
    ['kuendigung-bestaetigt', cancellationConfirmationEmail(endsAt)],
  ]

  const dir = path.resolve(__dirname, '../.email-preview')
  mkdirSync(dir, { recursive: true })
  for (const [name, mail] of emails) {
    writeFileSync(path.join(dir, `${name}.html`), mail.html)
    writeFileSync(path.join(dir, `${name}.txt`), `Betreff: ${mail.subject}\n\n${mail.text}\n`)
  }
  const list = emails
    .map(([name, mail]) => `<li><a href="${name}.html">${escapeHtml(mail.subject)}</a> · <a href="${name}.txt">Text</a></li>`)
    .join('\n')
  writeFileSync(
    path.join(dir, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>E-Mail-Vorschau</title><body style="font-family:sans-serif;padding:24px"><h1>E-Mail-Vorschau</h1><ul>${list}</ul></body>`
  )
  console.log(`E-Mail-Vorschau: ${path.join(dir, 'index.html')}`)
})
