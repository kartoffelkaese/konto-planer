# Logging

Zentrale Hilfsbibliothek: [`src/lib/logger.ts`](src/lib/logger.ts). Ausgabe über `console` mit Präfix (`[ERROR]`, `[WARN]`, …). `debug` nur bei `NODE_ENV=development`.

## Server-Logger

| Methode | Ausgabe |
|---------|---------|
| `logger.error(message, error?, context?)` | `console.error` – Fehler inkl. serialisiertem Stack |
| `logger.warn(message, context?)` | `console.warn` |
| `logger.info(message, context?)` | `console.info` |
| `logger.debug(message, context?)` | `console.debug` (nur Entwicklung) |

`context` ist ein optionales Objekt (z. B. `endpoint`, `userId`). Fehler werden als `{ name, message, stack }` angehängt.

**Beispiel (API-Route):**

```typescript
import { logger } from '@/lib/logger'

try {
  // …
} catch (error) {
  logger.error('Fehler beim Laden der Daten', error, {
    endpoint: '/api/example',
    userId: session?.user?.email,
  })
  return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
}
```

**Stand im Code:** `logger` wird derzeit in [`/api/dashboard`](src/app/api/dashboard/route.ts) und [`/api/error-log`](src/app/api/error-log/route.ts) genutzt. Viele andere API-Routen schreiben noch direkt per `console.error` – bei neuen oder geänderten Routen `logger` bevorzugen.

## Client-Fehler

React-Fehlergrenzen melden Fehler an den Server:

| Datei | Auslöser |
|-------|----------|
| [`src/app/error.tsx`](src/app/error.tsx) | Fehler in einer Route/Seite |
| [`src/app/global-error.tsx`](src/app/global-error.tsx) | Kritischer Fehler (Root-Layout); sendet `type: 'global-error'` |

Beide rufen `POST /api/error-log` auf (nur bei angemeldeter Session).

**Request-Body (Auszug):** `message`, `stack?`, `digest?`, `url?`, `userAgent?`, optional `type`

**Server:** kürzt `message` (max. 500 Zeichen), `stack` (max. 4096), protokolliert mit `logger.error('Client Error', …)` inkl. `userId` (E-Mail).

**Rate-Limit:** 30 Anfragen pro IP und Stunde (`RATE_LIMITS.errorLog` in [`src/lib/rate-limit.ts`](src/lib/rate-limit.ts)). Bei Überschreitung: `429`.

Details zur Route: [API.md](API.md) → `/api/error-log`.

## Produktion (PM2)

Mit [`ecosystem.config.js`](ecosystem.config.js) und `npm run pm2:start`:

| Datei | Inhalt |
|-------|--------|
| `./logs/pm2-out.log` | stdout (inkl. Logger-Ausgaben) |
| `./logs/pm2-error.log` | stderr |
| `./logs/pm2-combined.log` | kombiniert, mit Zeitstempel |

Befehle: `npm run pm2:logs`, `npm run pm2:restart`, `npm run pm2:stop`.

Vor dem ersten Start: `mkdir -p logs`.

## Reverse-Proxy

Für korrekte Client-IPs bei Rate-Limits (u. a. Error-Log): `TRUST_PROXY=true` setzen, wenn die App hinter nginx/Caddy läuft. Siehe [`src/lib/rate-limit.ts`](src/lib/rate-limit.ts).

## Hinweise

- Kein separates Log-Aggregat (ELK, Sentry o. Ä.) – Logs landen in der Node-/PM2-Ausgabe.
- Keine sensiblen Daten (Passwörter, vollständige Backups) in `context` oder Client-Meldungen loggen.
- In der Entwicklung (`npm run dev`) erscheinen Fehlerdetails zusätzlich in der Browser-Konsole und in `error.tsx` (nur `NODE_ENV=development`).
