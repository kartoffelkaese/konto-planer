import { sendEmail } from '@/lib/email'
import { formatDate } from '@/lib/dateUtils'
import { PLAN_LABELS } from '@/lib/plans'

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

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

/**
 * Kündigung ohne Anmeldung: Link zur Bestätigung an die angegebene Adresse. Erst der Klick
 * auf den Link (und die Bestätigung auf der Seite) kündigt – so kann niemand das Abo einer
 * fremden Adresse kündigen.
 */
export async function sendCancellationLink(email: string, confirmUrl: string): Promise<void> {
  const lines = [
    `für diese E-Mail-Adresse wurde die Kündigung des Abos „${PLAN_LABELS.FULL}“ angefordert.`,
    'Bitte bestätige die Kündigung über diesen Link. Das Abo endet dann zum Ende des bezahlten Zeitraums; bis dahin kannst du alles weiter nutzen, deine Daten bleiben erhalten.',
    'Der Link ist 24 Stunden gültig. Falls du die Kündigung nicht angefordert hast, ignoriere diese E-Mail – dann bleibt dein Abo bestehen.',
  ]
  await sendEmail({
    to: email,
    subject: 'Kündigung bestätigen – KontoPlaner',
    html: `<p>Hallo,</p><p>${escapeHtml(lines[0])}</p><p>${escapeHtml(lines[1])}</p><p><a href="${escapeHtml(confirmUrl)}">Kündigung bestätigen</a></p><p>${escapeHtml(lines[2])}</p>`,
    text: `Hallo,\n\n${lines[0]}\n\n${lines[1]}\n\nKündigung bestätigen:\n${confirmUrl}\n\n${lines[2]}`,
  })
}
