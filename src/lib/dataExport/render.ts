import { strToU8, zipSync } from 'fflate'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { formatDate, formatDateTime } from '@/lib/dateUtils'
import { fileNameSlug } from '@/lib/fileNameSlug'
import { SITE_NAME } from '@/lib/siteMetadata'
import type { ExportOwnAccount, UserDataExport } from '@/lib/dataExport/collect'

/** Was der Export bewusst nicht enthält – steht so auch in der Übersicht */
export const OMITTED_DATA = [
  'Passwort (gespeichert ist nur ein nicht umkehrbarer Hash, der nicht herausgegeben wird)',
  'Sicherheitsdaten wie Bestätigungs-Links und Sitzungsdaten',
  'Interne Kennungen der Datenbank und bei Stripe',
  'Buchungen geteilter Konten, deren Inhaber du nicht bist (enthalten ist deine Mitgliedschaft)',
  'Namen und E-Mail-Adressen anderer Personen; in Split-Listen erscheinen sie als „andere Person“',
  'Ausgaben und Ausgleiche in Split-Listen, an denen du nicht beteiligt bist',
]

type ExportOptions = {
  /** Absolute Adresse der Datenschutzerklärung, falls vorhanden */
  privacyUrl: string | null
}

// --- HTML ---------------------------------------------------------------------

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const text = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? '–' : escapeHtml(String(value))
const date = (value: string | null) => (value ? formatDate(value) : '–')
const dateTime = (value: string | null) => (value ? formatDateTime(value) : '–')
const yesNo = (value: boolean) => (value ? 'ja' : 'nein')
const money = (value: number) => escapeHtml(formatCurrency(value))

function definitionList(rows: [string, string][]): string {
  return `<dl>${rows.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${value}</dd>`).join('')}</dl>`
}

/** Tabelle; `cells` sind bereits maskiert. Leere Listen bekommen einen Hinweis statt Tabelle. */
function table(headers: string[], rows: string[][], numeric: number[] = []): string {
  if (rows.length === 0) return '<p class="empty">Keine Einträge.</p>'
  const cls = (i: number) => (numeric.includes(i) ? ' class="num"' : '')
  return `<div class="scroll"><table><thead><tr>${headers
    .map((h, i) => `<th${cls(i)}>${escapeHtml(h)}</th>`)
    .join('')}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell, i) => `<td${cls(i)}>${cell}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`
}

function accountSection(account: ExportOwnAccount): string {
  return `<section>
<h3>${escapeHtml(account.name)}</h3>
${definitionList([
  ['Art', text(account.type)],
  ['Bank', text(account.bank)],
  ['Gehaltstag', text(account.salaryDay)],
  ['Wiederkehrende Zahlungen eintragen', text(account.recurringAutoMode)],
  ['Absendername für Umbuchungen', text(account.transferSenderName)],
  ['Weitere Mitglieder', text(account.otherMembers)],
  ['Angelegt am', date(account.createdAt)],
])}
<h4>Kategorien</h4>
${table(['Name'], account.categories.map((c) => [text(c.name)]))}
<h4>Händler</h4>
${table(['Name', 'Kategorien'], account.merchants.map((m) => [text(m.name), text(m.categories.join(', '))]))}
<h4>Buchungen (${account.transactions.length})</h4>
${table(
  ['Datum', 'Händler', 'Beschreibung', 'Kategorie', 'Betrag', 'Art'],
  account.transactions.map((t) => [
    date(t.date),
    text(t.merchant),
    text(t.description),
    text(t.category),
    money(t.amount),
    text(transactionKind(t)),
  ]),
  [4]
)}
</section>`
}

/** Kurzbeschreibung einer Buchung für Übersicht und CSV */
export function transactionKind(t: ExportOwnAccount['transactions'][number]): string {
  const parts: string[] = []
  if (t.recurringTemplate) {
    parts.push(`wiederkehrend, ${t.recurringInterval ?? 'monatlich'}`.toLowerCase())
    if (t.recurringPaused) parts.push('pausiert')
  } else {
    parts.push(t.confirmed ? 'bestätigt' : 'ausstehend')
    if (t.fromRecurring) parts.push('aus wiederkehrender Zahlung')
  }
  if (t.transfer) parts.push(t.transferTarget ? `Umbuchung an ${t.transferTarget}` : 'Umbuchung')
  return parts.join(' · ')
}

export function renderHtml(data: UserDataExport, { privacyUrl }: ExportOptions): string {
  const { user, plan } = data
  const splitExpenses = data.splitLists.flatMap((l) => l.expenses)
  const splitSettlements = data.splitLists.flatMap((l) => l.settlements)

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Deine Daten bei ${escapeHtml(SITE_NAME)}</title>
<style>
:root{color-scheme:light}
body{margin:0;background:#f5f6f8;color:#12141a;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif}
main{max-width:960px;margin:0 auto;padding:24px 16px 48px}
h1{font-size:28px;margin:0 0 4px}
h2{font-size:20px;margin:32px 0 12px}
h3{font-size:17px;margin:20px 0 8px}
h4{font-size:15px;margin:16px 0 6px}
.meta,.empty,.hint{color:#5b6070}
section.card{background:#fff;border-radius:16px;padding:16px 20px;margin:12px 0;box-shadow:0 1px 3px rgba(18,20,26,.08)}
dl{display:grid;grid-template-columns:minmax(140px,max-content) 1fr;gap:4px 16px;margin:0}
dt{color:#5b6070}dd{margin:0}
.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e6e8ee;vertical-align:top}
th{color:#5b6070;font-weight:600}
.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
nav ul{margin:0;padding-left:20px}
a{color:#4f46e5}
@media print{body{background:#fff}section.card{box-shadow:none;border:1px solid #e6e8ee;break-inside:avoid-page}}
</style>
</head>
<body>
<main>
<h1>Deine Daten bei ${escapeHtml(SITE_NAME)}</h1>
<p class="meta">Erstellt am ${dateTime(data.createdAt)} für ${text(user.email)} · Exportversion ${text(data.version)}</p>
<p class="hint">Diese Datei enthält deine Finanzdaten. Bewahre sie sicher auf und gib sie nur weiter, wenn du das möchtest. Dieselben Daten liegen als Tabellen im Ordner <code>csv</code> und für andere Programme in <code>daten.json</code>.</p>

<nav class="card"><ul>
<li><a href="#benutzer">Benutzerkonto</a></li>
<li><a href="#level">Level und Abo</a></li>
<li><a href="#konten">Eigene Konten</a></li>
<li><a href="#geteilt">Geteilte Konten</a></li>
<li><a href="#split">Split-Listen</a></li>
<li><a href="#einladungen">Einladungen</a></li>
<li><a href="#verarbeitung">Angaben zur Verarbeitung</a></li>
</ul></nav>

<h2 id="benutzer">Benutzerkonto</h2>
<section class="card">${definitionList([
    ['E-Mail-Adresse', text(user.email)],
    ['Registriert am', dateTime(user.registeredAt)],
    ['E-Mail bestätigt am', dateTime(user.emailVerifiedAt)],
    ['Neue E-Mail-Adresse (unbestätigt)', text(user.pendingEmail)],
    ['Name in Split-Listen', text(user.splitDisplayName)],
    ['Letzte Anmeldung', dateTime(user.lastLoginAt)],
    ['Admin-Recht', yesNo(user.isAdmin)],
    ['Beschreibbares Konto bei „Start“', text(user.keptAccount)],
    ['Einführung „Wiederkehrend“ gesehen am', dateTime(user.recurringIntroSeenAt)],
  ])}</section>

<h2 id="level">Level und Abo</h2>
<section class="card">${definitionList([
    ['Geltendes Level', text(plan.current)],
    ['Gespeichertes Level', text(plan.stored)],
    ['Quelle', text(plan.source)],
    ['Gültig bis', dateTime(plan.expiresAt)],
    ['Abo-Status', text(plan.subscriptionStatus)],
    ['Abrechnung', text(plan.subscriptionInterval)],
    ['Gekündigt zum Periodenende', yesNo(plan.cancelAtPeriodEnd)],
    ['Kunde bei Stripe', yesNo(plan.stripeCustomer)],
  ])}
${plan.stripeCustomer ? '<p class="hint">Zahlungsdaten (Zahlungsmittel, Rechnungen) speichert nicht KontoPlaner, sondern der Zahlungsdienst Stripe. Du siehst sie im Kundenportal unter „Abo verwalten“.</p>' : ''}
<h3>Verlauf</h3>
${table(
  ['Datum', 'Von', 'Nach', 'Quelle', 'Befristet bis', 'Geändert von', 'Notiz'],
  data.planChanges.map((c) => [
    dateTime(c.date),
    text(c.from),
    text(c.to),
    text(c.source),
    date(c.expiresAt),
    text(c.changedBy),
    text(c.note),
  ])
)}</section>

<h2 id="konten">Eigene Konten</h2>
${data.ownAccounts.length === 0 ? '<p class="empty">Keine eigenen Konten.</p>' : data.ownAccounts.map((a) => accountSection(a).replace('<section>', '<section class="card">')).join('\n')}

<h2 id="geteilt">Geteilte Konten</h2>
<section class="card">
<p class="hint">Konten anderer Personen, in denen du Mitglied bist. Die Buchungen gehören zum Konto der anderen Person und sind hier nicht enthalten.</p>
${table(['Konto', 'Rolle', 'Mitglied seit'], data.sharedAccounts.map((a) => [text(a.name), text(a.role), date(a.memberSince)]))}
</section>

<h2 id="split">Split-Listen</h2>
<section class="card">
${table(
  ['Liste', 'Rolle', 'Status', 'Dein Name', 'Mitglied seit', 'Währungen', 'Öffentlicher Link'],
  data.splitLists.map((l) => [
    text(l.name),
    text(l.role),
    text(l.status),
    text(l.yourName),
    date(l.memberSince),
    text(l.currencies.join(', ')),
    l.publicLinkActive === null ? '–' : yesNo(l.publicLinkActive),
  ])
)}
<h3>Ausgaben, an denen du beteiligt bist</h3>
${table(
  ['Liste', 'Datum', 'Beschreibung', 'Kategorie', 'Betrag', 'Bezahlt von', 'Beteiligte', 'Dein Anteil'],
  splitExpenses.map((e) => [
    text(e.list),
    date(e.date),
    text(e.description),
    text(e.category),
    money(e.amount) +
      (e.originalCurrency && e.originalAmount !== null
        ? `<br><span class="meta">${escapeHtml(formatNumber(e.originalAmount))} ${text(e.originalCurrency)}</span>`
        : ''),
    text(e.paidBy),
    text(e.participants),
    money(e.yourShare),
  ]),
  [4, 6, 7]
)}
<h3>Ausgleiche von oder an dich</h3>
${table(
  ['Liste', 'Datum', 'Von', 'An', 'Betrag', 'Notiz'],
  splitSettlements.map((s) => [text(s.list), date(s.date), text(s.from), text(s.to), money(s.amount), text(s.note)]),
  [4]
)}
</section>

<h2 id="einladungen">Einladungen</h2>
<section class="card">
<h3>Von dir verschickt</h3>
${table(
  ['Datum', 'Art', 'Konto oder Liste', 'Rolle', 'Status'],
  data.invitationsSent.map((i) => [date(i.date), text(i.kind), text(i.name), text(i.role), text(i.status)])
)}
<h3>An dich, noch offen</h3>
${table(
  ['Datum', 'Art', 'Konto oder Liste', 'Rolle'],
  data.invitationsReceived.map((i) => [date(i.date), text(i.kind), text(i.name), text(i.role)])
)}
</section>

<h2 id="verarbeitung">Angaben zur Verarbeitung</h2>
<section class="card">
<p><strong>Zweck:</strong> Wir verarbeiten deine Daten, um dir ${escapeHtml(SITE_NAME)} bereitzustellen: Konten, Buchungen, Planung, Auswertungen und gemeinsame Split-Listen. Deine E-Mail-Adresse nutzen wir für Anmeldung, Bestätigungen und Einladungen.</p>
<p><strong>Empfänger:</strong> Der Betrieb liegt bei einem Hosting-Anbieter (netcup). E-Mails werden über einen E-Mail-Dienst versendet. Für ein Abo verarbeitet der Zahlungsdienst Stripe deine Zahlungsdaten. Andere Mitglieder geteilter Konten und Split-Listen sehen die Daten dieser Konten und Listen.</p>
<p><strong>Speicherdauer:</strong> Solange deine Anmeldung besteht. Löschst du sie, werden deine Konten (sofern sie nicht mit anderen geteilt sind) und deine Split-Listen mit gelöscht.</p>
<p><strong>Deine Rechte:</strong> Du kannst Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragung verlangen und der Verarbeitung widersprechen. Vieles kannst du direkt in der App ändern; deinen Zugang löschst du unter Einstellungen → „Anmeldung löschen“. Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren.</p>
${privacyUrl ? `<p>Alle Einzelheiten stehen in der <a href="${escapeHtml(privacyUrl)}">Datenschutzerklärung</a>.</p>` : ''}
<h3>Nicht enthalten</h3>
<ul>${OMITTED_DATA.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
</section>
</main>
</body>
</html>
`
}

// --- CSV ----------------------------------------------------------------------

export type CsvColumn<T> = {
  header: string
  value: (row: T) => string | number | boolean | null
}

const FORMULA_START = /^[=+\-@\t\r]/

/** Eine Zelle: Zahlen mit Dezimalkomma, Text gegen Formeln geschützt und in Anführungszeichen */
export function csvCell(value: string | number | boolean | null): string {
  if (value === null) return ''
  if (typeof value === 'boolean') return value ? 'ja' : 'nein'
  if (typeof value === 'number') return String(value).replace('.', ',')
  const safe = FORMULA_START.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

/** CSV für Excel (deutsch): Semikolon, CRLF, UTF-8 mit BOM */
export function renderCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [
    columns.map((c) => csvCell(c.header)).join(';'),
    ...rows.map((row) => columns.map((c) => csvCell(c.value(row))).join(';')),
  ]
  return `﻿${lines.join('\r\n')}\r\n`
}

const csvDate = (value: string | null) => (value ? formatDate(value) : null)
const csvDateTime = (value: string | null) => (value ? formatDateTime(value) : null)

// --- ZIP ----------------------------------------------------------------------

/** Dateinamen im ZIP; doppelte Kontonamen bekommen eine Nummer */
function uniqueSlugs(names: string[]): string[] {
  const used = new Map<string, number>()
  return names.map((name) => {
    const base = fileNameSlug(name) || 'konto'
    const count = (used.get(base) ?? 0) + 1
    used.set(base, count)
    return count === 1 ? base : `${base}-${count}`
  })
}

export function buildExportFiles(data: UserDataExport, options: ExportOptions): Record<string, string> {
  const files: Record<string, string> = {
    'Uebersicht.html': renderHtml(data, options),
    'daten.json': `${JSON.stringify(data, null, 2)}\n`,
    'csv/benutzer.csv': renderCsv(
      [
        ['E-Mail-Adresse', data.user.email],
        ['Registriert am', csvDateTime(data.user.registeredAt)],
        ['E-Mail bestätigt am', csvDateTime(data.user.emailVerifiedAt)],
        ['Neue E-Mail-Adresse (unbestätigt)', data.user.pendingEmail],
        ['Name in Split-Listen', data.user.splitDisplayName],
        ['Letzte Anmeldung', csvDateTime(data.user.lastLoginAt)],
        ['Admin-Recht', data.user.isAdmin],
        ['Geltendes Level', data.plan.current],
        ['Gespeichertes Level', data.plan.stored],
        ['Quelle', data.plan.source],
        ['Gültig bis', csvDateTime(data.plan.expiresAt)],
        ['Abo-Status', data.plan.subscriptionStatus],
        ['Abrechnung', data.plan.subscriptionInterval],
        ['Gekündigt zum Periodenende', data.plan.cancelAtPeriodEnd],
        ['Kunde bei Stripe', data.plan.stripeCustomer],
      ] as [string, string | boolean | null][],
      [
        { header: 'Angabe', value: (r) => r[0] },
        { header: 'Wert', value: (r) => r[1] },
      ]
    ),
    'csv/level-verlauf.csv': renderCsv(data.planChanges, [
      { header: 'Datum', value: (c) => csvDateTime(c.date) },
      { header: 'Von', value: (c) => c.from },
      { header: 'Nach', value: (c) => c.to },
      { header: 'Quelle', value: (c) => c.source },
      { header: 'Befristet bis', value: (c) => csvDate(c.expiresAt) },
      { header: 'Geändert von', value: (c) => c.changedBy },
      { header: 'Notiz', value: (c) => c.note },
    ]),
    'csv/geteilte-konten.csv': renderCsv(data.sharedAccounts, [
      { header: 'Konto', value: (a) => a.name },
      { header: 'Rolle', value: (a) => a.role },
      { header: 'Mitglied seit', value: (a) => csvDate(a.memberSince) },
    ]),
    'csv/split-listen.csv': renderCsv(data.splitLists, [
      { header: 'Liste', value: (l) => l.name },
      { header: 'Beschreibung', value: (l) => l.description },
      { header: 'Rolle', value: (l) => l.role },
      { header: 'Status', value: (l) => l.status },
      { header: 'Dein Name', value: (l) => l.yourName },
      { header: 'Mitglied seit', value: (l) => csvDate(l.memberSince) },
      { header: 'Währungen', value: (l) => l.currencies.join(', ') },
      { header: 'Öffentlicher Link', value: (l) => l.publicLinkActive },
    ]),
    'csv/split-ausgaben.csv': renderCsv(
      data.splitLists.flatMap((l) => l.expenses),
      [
        { header: 'Liste', value: (e) => e.list },
        { header: 'Datum', value: (e) => csvDate(e.date) },
        { header: 'Beschreibung', value: (e) => e.description },
        { header: 'Kategorie', value: (e) => e.category },
        { header: 'Betrag (EUR)', value: (e) => e.amount },
        { header: 'Originalbetrag', value: (e) => e.originalAmount },
        { header: 'Originalwährung', value: (e) => e.originalCurrency },
        { header: 'Kurs', value: (e) => e.exchangeRate },
        { header: 'Bezahlt von', value: (e) => e.paidBy },
        { header: 'Beteiligte', value: (e) => e.participants },
        { header: 'Dein Anteil (EUR)', value: (e) => e.yourShare },
      ]
    ),
    'csv/split-ausgleiche.csv': renderCsv(
      data.splitLists.flatMap((l) => l.settlements),
      [
        { header: 'Liste', value: (s) => s.list },
        { header: 'Datum', value: (s) => csvDate(s.date) },
        { header: 'Von', value: (s) => s.from },
        { header: 'An', value: (s) => s.to },
        { header: 'Betrag (EUR)', value: (s) => s.amount },
        { header: 'Notiz', value: (s) => s.note },
      ]
    ),
    'csv/einladungen.csv': renderCsv(
      [
        ...data.invitationsSent.map((i) => ({ ...i, direction: 'von dir' })),
        ...data.invitationsReceived.map((i) => ({ ...i, status: 'offen', direction: 'an dich' })),
      ],
      [
        { header: 'Richtung', value: (i) => i.direction },
        { header: 'Datum', value: (i) => csvDate(i.date) },
        { header: 'Art', value: (i) => i.kind },
        { header: 'Konto oder Liste', value: (i) => i.name },
        { header: 'Rolle', value: (i) => i.role },
        { header: 'Status', value: (i) => i.status },
      ]
    ),
  }

  const slugs = uniqueSlugs(data.ownAccounts.map((a) => a.name))
  data.ownAccounts.forEach((account, i) => {
    const slug = slugs[i]
    files[`csv/konto-${slug}-buchungen.csv`] = renderCsv(account.transactions, [
      { header: 'Datum', value: (t) => csvDate(t.date) },
      { header: 'Händler', value: (t) => t.merchant },
      { header: 'Beschreibung', value: (t) => t.description },
      { header: 'Kategorie', value: (t) => t.category },
      { header: 'Betrag (EUR)', value: (t) => t.amount },
      { header: 'Bestätigt', value: (t) => t.confirmed },
      { header: 'Wiederkehrende Vorlage', value: (t) => t.recurringTemplate },
      { header: 'Intervall', value: (t) => t.recurringInterval },
      { header: 'Pausiert', value: (t) => t.recurringPaused },
      { header: 'Aus wiederkehrender Zahlung', value: (t) => t.fromRecurring },
      { header: 'Umbuchung', value: (t) => t.transfer },
      { header: 'Umbuchung an', value: (t) => t.transferTarget },
      { header: 'Angelegt am', value: (t) => csvDateTime(t.createdAt) },
    ])
    files[`csv/konto-${slug}-kategorien.csv`] = renderCsv(account.categories, [
      { header: 'Name', value: (c) => c.name },
      { header: 'Farbe', value: (c) => c.color },
    ])
    files[`csv/konto-${slug}-haendler.csv`] = renderCsv(account.merchants, [
      { header: 'Name', value: (m) => m.name },
      { header: 'Kategorien', value: (m) => m.categories.join(', ') },
    ])
  })

  return files
}

/** Fertige ZIP-Datei mit Übersicht, CSV-Dateien und JSON */
export function buildExportZip(data: UserDataExport, options: ExportOptions): Uint8Array {
  const files = buildExportFiles(data, options)
  const mtime = new Date(data.createdAt)
  return zipSync(
    Object.fromEntries(
      Object.entries(files).map(([name, content]) => [name, [strToU8(content), { mtime }]])
    ),
    { level: 6 }
  )
}
