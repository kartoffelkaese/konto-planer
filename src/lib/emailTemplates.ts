import { formatDate } from '@/lib/dateUtils'
import { PLAN_LABELS } from '@/lib/plans'
import { renderEmail, type RenderedEmail } from '@/lib/emailLayout'

/**
 * Inhalte aller E-Mails. Reine Funktionen ohne Versand – genutzt vom Versand, von den Tests
 * und von der Vorschau (`npm run email:preview`).
 */

const ACCOUNT_FOOTER = 'Du bekommst diese E-Mail, weil sie für dein KontoPlaner-Konto angefordert wurde.'

export function signupVerificationEmail(verifyUrl: string): RenderedEmail {
  return renderEmail({
    subject: 'Bitte bestätige deine E-Mail-Adresse – KontoPlaner',
    preheader: 'Ein Klick, dann kannst du KontoPlaner nutzen.',
    title: 'E-Mail-Adresse bestätigen',
    paragraphs: [
      'vielen Dank für deine Registrierung bei KontoPlaner.',
      'Bitte bestätige deine E-Mail-Adresse:',
    ],
    button: { label: 'E-Mail-Adresse bestätigen', url: verifyUrl },
    notes: ['Der Link ist 24 Stunden gültig.'],
    footerNote: 'Du bekommst diese E-Mail, weil mit dieser Adresse ein KontoPlaner-Konto erstellt wurde.',
  })
}

export function emailChangeVerificationEmail(verifyUrl: string): RenderedEmail {
  return renderEmail({
    subject: 'Neue E-Mail-Adresse bestätigen – KontoPlaner',
    preheader: 'Bestätige deine neue Adresse für KontoPlaner.',
    title: 'Neue E-Mail-Adresse bestätigen',
    paragraphs: ['bitte bestätige deine neue E-Mail-Adresse für KontoPlaner:'],
    button: { label: 'E-Mail-Adresse bestätigen', url: verifyUrl },
    notes: [
      'Der Link ist 24 Stunden gültig.',
      'Falls du diese Änderung nicht angefordert hast, ignoriere diese E-Mail.',
    ],
    footerNote: 'Du bekommst diese E-Mail, weil diese Adresse für ein KontoPlaner-Konto eingetragen wurde.',
  })
}

export function passwordResetEmail(resetUrl: string): RenderedEmail {
  return renderEmail({
    subject: 'Passwort zurücksetzen – KontoPlaner',
    preheader: 'Lege ein neues Passwort für dein KontoPlaner-Konto fest.',
    title: 'Passwort zurücksetzen',
    paragraphs: ['für dein KontoPlaner-Konto wurde ein neues Passwort angefordert:'],
    button: { label: 'Neues Passwort festlegen', url: resetUrl },
    notes: [
      'Der Link ist 1 Stunde gültig. Danach werden alle anderen Anmeldungen beendet.',
      'Falls du das nicht angefordert hast, ignoriere diese E-Mail – dein Passwort bleibt unverändert.',
    ],
    footerNote: ACCOUNT_FOOTER,
  })
}

export function alreadyRegisteredEmail(baseUrl: string): RenderedEmail {
  return renderEmail({
    subject: 'Du hast bereits ein Konto – KontoPlaner',
    preheader: 'Mit dieser Adresse gibt es schon ein KontoPlaner-Konto.',
    title: 'Du hast bereits ein Konto',
    paragraphs: [
      'mit dieser E-Mail-Adresse wurde gerade versucht, ein KontoPlaner-Konto zu erstellen. Du hast bereits eines.',
    ],
    button: { label: 'Zur Anmeldung', url: `${baseUrl}/auth/login` },
    links: [{ label: 'Passwort vergessen?', url: `${baseUrl}/auth/forgot-password` }],
    notes: ['Falls du das nicht warst, kannst du diese E-Mail ignorieren.'],
    footerNote: 'Du bekommst diese E-Mail, weil mit dieser Adresse eine Registrierung versucht wurde.',
  })
}

export function cancellationConfirmationEmail(endsAt: Date | null, receivedAt = new Date()): RenderedEmail {
  const until = endsAt ? ` zum ${formatDate(endsAt)}` : ''
  return renderEmail({
    subject: 'Bestätigung deiner Kündigung – KontoPlaner',
    preheader: `Dein Abo „${PLAN_LABELS.FULL}“ endet${until}.`,
    title: 'Kündigung bestätigt',
    paragraphs: [
      `deine Kündigung des Abos „${PLAN_LABELS.FULL}“ ist bei uns eingegangen am ${formatDate(receivedAt)}.`,
      `Das Abo endet${until}. Bis dahin kannst du „${PLAN_LABELS.FULL}“ weiter nutzen, danach gilt das kostenlose Level „${PLAN_LABELS.BASIC}“. Deine Daten bleiben erhalten.`,
    ],
    footerNote: 'Du bekommst diese E-Mail als Bestätigung deiner Kündigung bei KontoPlaner.',
  })
}

/**
 * Kündigung ohne Anmeldung: Link zur Bestätigung an die angegebene Adresse. Erst der Klick
 * auf den Link (und die Bestätigung auf der Seite) kündigt – so kann niemand das Abo einer
 * fremden Adresse kündigen.
 */
export function cancellationLinkEmail(confirmUrl: string): RenderedEmail {
  return renderEmail({
    subject: 'Kündigung bestätigen – KontoPlaner',
    preheader: `Bestätige die Kündigung deines Abos „${PLAN_LABELS.FULL}“.`,
    title: 'Kündigung bestätigen',
    paragraphs: [
      `für diese E-Mail-Adresse wurde die Kündigung des Abos „${PLAN_LABELS.FULL}“ angefordert.`,
      'Bitte bestätige die Kündigung über diesen Link. Das Abo endet dann zum Ende des bezahlten Zeitraums; bis dahin kannst du alles weiter nutzen, deine Daten bleiben erhalten.',
    ],
    button: { label: 'Kündigung bestätigen', url: confirmUrl },
    notes: [
      'Der Link ist 24 Stunden gültig. Falls du die Kündigung nicht angefordert hast, ignoriere diese E-Mail – dann bleibt dein Abo bestehen.',
    ],
    footerNote: 'Du bekommst diese E-Mail, weil auf KontoPlaner die Kündigung für diese Adresse angefordert wurde.',
  })
}
