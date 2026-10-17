import { sendEmail } from '@/lib/email'
import { cancellationConfirmationEmail, cancellationLinkEmail } from '@/lib/emailTemplates'

/** Bestätigung einer Kündigung mit Enddatum */
export async function sendCancellationConfirmation(email: string, endsAt: Date | null): Promise<void> {
  await sendEmail({ to: email, ...cancellationConfirmationEmail(endsAt) })
}

/** Kündigung ohne Anmeldung: Link zur Bestätigung an die angegebene Adresse */
export async function sendCancellationLink(email: string, confirmUrl: string): Promise<void> {
  await sendEmail({ to: email, ...cancellationLinkEmail(confirmUrl) })
}
