import { sendEmail } from '@/lib/email'
import { formatDate } from '@/lib/dateUtils'
import { PLAN_LABELS } from '@/lib/plans'

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Empfänger für Kündigungsaufträge ohne Anmeldung: der Betreiber */
export function billingContactEmail(): string | null {
  const explicit = process.env.BILLING_CONTACT_EMAIL?.trim()
  if (explicit) return explicit
  // „Name <adresse>“ → Adresse
  const from = process.env.SMTP_FROM ?? ''
  return /<([^>]+)>/.exec(from)?.[1] ?? (from.includes('@') ? from.trim() : null)
}

/** Bestätigung einer Kündigung in Textform */
export async function sendCancellationConfirmation(email: string, endsAt: Date | null): Promise<void> {
  const until = endsAt ? ` zum ${formatDate(endsAt)}` : ''
  const lines = [
    `deine Kündigung des Abos „${PLAN_LABELS.FULL}“ ist bei uns eingegangen am ${formatDate(new Date())}.`,
    `Das Abo endet${until}. Bis dahin kannst du „${PLAN_LABELS.FULL}“ weiter nutzen, danach gilt das kostenlose Level „${PLAN_LABELS.BASIC}“. Deine Daten bleiben erhalten.`,
  ]
  await sendEmail({
    to: email,
    subject: 'Bestätigung deiner Kündigung – KontoPlaner',
    html: `<p>Hallo,</p>${lines.map((l) => `<p>${escapeHtml(l)}</p>`).join('')}`,
    text: `Hallo,\n\n${lines.join('\n\n')}`,
  })
}

/** Kündigung ohne Anmeldung: Auftrag an den Betreiber, Eingangsbestätigung an die Person */
export async function sendCancellationRequest(email: string, note: string | null): Promise<void> {
  const contact = billingContactEmail()
  if (!contact) throw new Error('Keine Kontaktadresse für Kündigungen eingerichtet')

  const received = formatDate(new Date())
  await sendEmail({
    to: contact,
    subject: 'Kündigung über das Formular – KontoPlaner',
    html: `<p>Kündigung des Abos „${PLAN_LABELS.FULL}“, eingegangen am ${received}.</p><p>E-Mail-Adresse: ${escapeHtml(email)}</p>${note ? `<p>Anmerkung: ${escapeHtml(note)}</p>` : ''}<p>Bitte das Abo in der Verwaltung bzw. bei Stripe zum Periodenende kündigen.</p>`,
    text: `Kündigung des Abos „${PLAN_LABELS.FULL}“, eingegangen am ${received}.\n\nE-Mail-Adresse: ${email}${note ? `\nAnmerkung: ${note}` : ''}\n\nBitte das Abo in der Verwaltung bzw. bei Stripe zum Periodenende kündigen.`,
  })

  const lines = [
    `wir haben am ${received} eine Kündigung des Abos „${PLAN_LABELS.FULL}“ für diese E-Mail-Adresse erhalten.`,
    'Gibt es zu dieser Adresse ein laufendes Abo, wird es zum Ende des bezahlten Zeitraums beendet. Du erhältst dazu keine weitere Nachricht.',
    'Falls du diese Kündigung nicht abgeschickt hast, antworte bitte auf diese E-Mail.',
  ]
  await sendEmail({
    to: email,
    subject: 'Eingang deiner Kündigung – KontoPlaner',
    html: `<p>Hallo,</p>${lines.map((l) => `<p>${escapeHtml(l)}</p>`).join('')}`,
    text: `Hallo,\n\n${lines.join('\n\n')}`,
  })
}
