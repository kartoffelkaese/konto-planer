import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

export type SendEmailOptions = {
  to: string
  subject: string
  html: string
  text: string
}

let transporter: Transporter | null = null

function getSmtpConfig() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM
  const secure = process.env.SMTP_SECURE === 'true'

  if (!host || !user || !pass || !from) {
    throw new Error('SMTP-Konfiguration unvollständig')
  }

  return { host, port, user, pass, from, secure }
}

function getTransporter(): Transporter {
  if (!transporter) {
    const { host, port, user, pass, secure } = getSmtpConfig()
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    })
  }
  return transporter
}

export function getAuthBaseUrl(): string {
  const url = process.env.AUTH_URL || process.env.NEXTAUTH_URL
  if (url) {
    return url.replace(/\/$/, '')
  }
  const port = process.env.PORT ?? '3000'
  return `http://localhost:${port}`
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { from } = getSmtpConfig()
  await getTransporter().sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  })
}

export const SMTP_ENV_KEYS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
] as const
