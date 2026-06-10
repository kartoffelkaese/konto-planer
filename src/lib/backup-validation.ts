import { NextResponse } from 'next/server'

export const BACKUP_MAX_BYTES = 5 * 1024 * 1024
export const BACKUP_MAX_ARRAY_ITEMS = 10_000
const MAX_NAME_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 1000

function isNonEmptyString(value: unknown, maxLen: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLen
}

/** Betrag: Zahl oder numerischer String (Prisma Decimal wird als String exportiert). */
function isValidAmount(value: unknown): boolean {
  if (typeof value !== 'number' && typeof value !== 'string') return false
  const num = Number(value)
  // Decimal(10,2): max. 8 Vorkommastellen
  return Number.isFinite(num) && Math.abs(num) < 100_000_000
}

function isValidDateString(value: unknown): boolean {
  return (
    typeof value === 'string' && !Number.isNaN(new Date(value).getTime())
  )
}

export function validateBackupPayload(
  backup: unknown,
  bodyByteLength?: number
): NextResponse | null {
  if (bodyByteLength !== undefined && bodyByteLength > BACKUP_MAX_BYTES) {
    return NextResponse.json(
      { error: 'Backup-Datei ist zu groß' },
      { status: 400 }
    )
  }

  if (!backup || typeof backup !== 'object') {
    return NextResponse.json(
      { error: 'Ungültiges Backup-Format' },
      { status: 400 }
    )
  }

  const b = backup as Record<string, unknown>

  if (!b.version || !Array.isArray(b.categories) || !Array.isArray(b.merchants) || !Array.isArray(b.transactions)) {
    return NextResponse.json(
      { error: 'Ungültiges Backup-Format' },
      { status: 400 }
    )
  }

  const arrays = [b.categories, b.merchants, b.transactions] as unknown[][]
  for (const arr of arrays) {
    if (arr.length > BACKUP_MAX_ARRAY_ITEMS) {
      return NextResponse.json(
        { error: 'Backup enthält zu viele Einträge' },
        { status: 400 }
      )
    }
  }

  for (const category of b.categories as unknown[]) {
    if (!category || typeof category !== 'object') {
      return NextResponse.json({ error: 'Ungültige Kategorie im Backup' }, { status: 400 })
    }
    const c = category as Record<string, unknown>
    if (!isNonEmptyString(c.name, MAX_NAME_LENGTH) || !isNonEmptyString(c.color, 20)) {
      return NextResponse.json({ error: 'Ungültige Kategorie im Backup' }, { status: 400 })
    }
  }

  for (const merchant of b.merchants as unknown[]) {
    if (!merchant || typeof merchant !== 'object') {
      return NextResponse.json({ error: 'Ungültiger Händler im Backup' }, { status: 400 })
    }
    const m = merchant as Record<string, unknown>
    if (!isNonEmptyString(m.name, MAX_NAME_LENGTH)) {
      return NextResponse.json({ error: 'Ungültiger Händler im Backup' }, { status: 400 })
    }
  }

  for (const transaction of b.transactions as unknown[]) {
    if (!transaction || typeof transaction !== 'object') {
      return NextResponse.json({ error: 'Ungültige Transaktion im Backup' }, { status: 400 })
    }
    const t = transaction as Record<string, unknown>
    if (!isNonEmptyString(t.merchant, MAX_NAME_LENGTH)) {
      return NextResponse.json({ error: 'Ungültige Transaktion im Backup' }, { status: 400 })
    }
    if (
      t.description != null &&
      (typeof t.description !== 'string' || t.description.length > MAX_DESCRIPTION_LENGTH)
    ) {
      return NextResponse.json({ error: 'Ungültige Transaktion im Backup' }, { status: 400 })
    }
    if (!isValidAmount(t.amount)) {
      return NextResponse.json(
        { error: 'Ungültiger Betrag in Transaktion im Backup' },
        { status: 400 }
      )
    }
    if (!isValidDateString(t.date)) {
      return NextResponse.json(
        { error: 'Ungültiges Datum in Transaktion im Backup' },
        { status: 400 }
      )
    }
    if (t.lastConfirmedDate != null && !isValidDateString(t.lastConfirmedDate)) {
      return NextResponse.json(
        { error: 'Ungültiges Datum in Transaktion im Backup' },
        { status: 400 }
      )
    }
  }

  return null
}
