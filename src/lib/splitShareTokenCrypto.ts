import { createHash, randomBytes } from 'crypto'

export function hashShareToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

export function generateShareToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString('base64url')
  return { rawToken, tokenHash: hashShareToken(rawToken) }
}

export function buildSplitShareUrl(rawToken: string): string {
  const base =
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3001'
  return `${base.replace(/\/$/, '')}/split/s/${encodeURIComponent(rawToken)}`
}
