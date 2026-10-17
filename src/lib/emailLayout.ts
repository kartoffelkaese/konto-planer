import { getAuthBaseUrl } from '@/lib/email'
import { AVAILABLE_LEGAL_PAGES, type LEGAL_PAGES } from '@/lib/legalPages'

/**
 * Gemeinsame Vorlage für alle E-Mails.
 *
 * HTML mit Tabellen-Layout und Inline-Styles – das stellen E-Mail-Programme zuverlässig dar.
 * Die Text-Fassung entsteht aus denselben Bausteinen, damit beide immer übereinstimmen.
 * Die Farben entsprechen dem hellen Design (DESIGN.md); einen eigenen Dunkelmodus gibt es
 * nicht, die automatische Umwandlung der Programme bleibt mit diesen Farben lesbar.
 */

export type EmailLink = { label: string; url: string }

export type EmailContent = {
  subject: string
  /** Vorschauzeile im Posteingang (unsichtbar in der E-Mail selbst) */
  preheader: string
  /** Überschrift in der Karte */
  title: string
  /** Absätze vor dem Knopf; der erste folgt auf „Hallo,“ */
  paragraphs: string[]
  /** Hauptaktion als Knopf; darunter steht der Link zusätzlich als Text */
  button?: EmailLink
  /** Weitere Links in kleiner Schrift, z. B. „Passwort vergessen?“ */
  links?: EmailLink[]
  /** Hinweise nach dem Knopf in Nebentext (Gültigkeit, „Falls du das nicht warst …“) */
  notes?: string[]
  /** Warum diese E-Mail kommt – steht in der Fußzeile */
  footerNote: string
}

export type RenderedEmail = { subject: string; html: string; text: string }

type LegalPage = (typeof LEGAL_PAGES)[number]

const APP_NAME = 'KontoPlaner'

const COLORS = {
  canvas: '#f5f6f8',
  surface: '#ffffff',
  hairline: '#e6e8ee',
  primary: '#12141a',
  secondary: '#5b6070',
  accent: '#4f46e5',
  accentForeground: '#ffffff',
}

const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

export function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  )
}

function paragraph(text: string, style: string): string {
  return `<p style="margin:0 0 16px;${style}">${escapeHtml(text)}</p>`
}

function link(item: EmailLink, color: string): string {
  return `<a href="${escapeHtml(item.url)}" style="color:${color};text-decoration:underline;">${escapeHtml(item.label)}</a>`
}

/** „Bulletproof“-Knopf: Tabelle mit Hintergrundfarbe und Link, funktioniert auch in Outlook */
function button(item: EmailLink): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td align="center" bgcolor="${COLORS.accent}" style="border-radius:12px;background:${COLORS.accent};">
      <a href="${escapeHtml(item.url)}" target="_blank" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:15px;font-weight:600;line-height:20px;color:${COLORS.accentForeground};text-decoration:none;border-radius:12px;">${escapeHtml(item.label)}</a>
    </td>
  </tr>
</table>`
}

export function renderEmail(
  content: EmailContent,
  legalPages: readonly LegalPage[] = AVAILABLE_LEGAL_PAGES
): RenderedEmail {
  const baseUrl = getAuthBaseUrl()
  const legalLinks: EmailLink[] = legalPages.map((page) => ({
    label: page.label,
    url: `${baseUrl}/${page.slug}`,
  }))
  const bodyText = `font-size:15px;line-height:24px;color:${COLORS.primary};`
  const smallText = `font-size:13px;line-height:20px;color:${COLORS.secondary};`

  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.canvas};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.canvas}" style="background:${COLORS.canvas};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;font-family:${FONT};">
        <tr>
          <td style="padding:0 8px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="32" height="32" align="center" valign="middle" bgcolor="${COLORS.accent}" style="width:32px;height:32px;border-radius:10px;background:${COLORS.accent};font-family:${FONT};font-size:15px;font-weight:700;line-height:32px;color:${COLORS.accentForeground};">K</td>
                <td style="padding-left:10px;font-family:${FONT};font-size:16px;font-weight:650;color:${COLORS.primary};">${APP_NAME}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td bgcolor="${COLORS.surface}" style="background:${COLORS.surface};border:1px solid ${COLORS.hairline};border-radius:20px;padding:32px 28px;">
            <h1 style="margin:0 0 20px;font-family:${FONT};font-size:22px;line-height:28px;font-weight:650;color:${COLORS.primary};">${escapeHtml(content.title)}</h1>
            ${paragraph('Hallo,', bodyText)}
            ${content.paragraphs.map((text) => paragraph(text, bodyText)).join('\n            ')}
            ${content.button ? button(content.button) : ''}
            ${content.links?.length ? `<p style="margin:0 0 16px;${smallText}">${content.links.map((item) => link(item, COLORS.accent)).join(' &middot; ')}</p>` : ''}
            ${(content.notes ?? []).map((text) => paragraph(text, smallText)).join('\n            ')}
            ${content.button ? `<p style="margin:0;padding-top:16px;border-top:1px solid ${COLORS.hairline};${smallText}">Falls der Knopf nicht funktioniert, kopiere diesen Link in deinen Browser:<br><a href="${escapeHtml(content.button.url)}" style="color:${COLORS.accent};word-break:break-all;">${escapeHtml(content.button.url)}</a></p>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 8px 0;font-family:${FONT};${smallText}">
            <p style="margin:0 0 8px;">${escapeHtml(content.footerNote)}</p>
            ${legalLinks.length ? `<p style="margin:0;">${legalLinks.map((item) => link(item, COLORS.secondary)).join(' &middot; ')}</p>` : ''}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`

  const textParts = [
    'Hallo,',
    ...content.paragraphs,
    ...(content.button ? [`${content.button.label}:\n${content.button.url}`] : []),
    ...(content.links ?? []).map((item) => `${item.label}:\n${item.url}`),
    ...(content.notes ?? []),
    '–',
    content.footerNote,
    ...(legalLinks.length ? [legalLinks.map((item) => `${item.label}: ${item.url}`).join('\n')] : []),
  ]

  return { subject: content.subject, html, text: textParts.join('\n\n') }
}
