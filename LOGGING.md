# Error Logging System

Dieses Projekt verwendet ein umfassendes Error-Logging-System, um Crashes und Fehler zu verfolgen.

## Log-Dateien

Alle Logs werden im `logs/` Verzeichnis gespeichert:

- `logs/error.log` - Nur Fehler
- `logs/app.log` - Alle Logs (Info, Warn, Error, Debug)
- `logs/pm2-error.log` - PM2 Error-Logs
- `logs/pm2-out.log` - PM2 Output-Logs
- `logs/pm2-combined.log` - PM2 kombinierte Logs

## Logger-Verwendung

### In API-Routen

```typescript
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    // Dein Code
  } catch (error) {
    logger.error('Fehler beim Laden der Daten', error, {
      endpoint: '/api/example',
      userId: session?.user?.email
    })
    return NextResponse.json({ error: 'Fehler' }, { status: 500 })
  }
}
```

### Mit Error-Handler Wrapper

```typescript
import { withErrorHandling } from '@/lib/apiErrorHandler'

export const GET = withErrorHandling(async (request: Request) => {
  // Dein Code - Fehler werden automatisch geloggt
  return NextResponse.json({ data: 'example' })
})
```

### Logger-Methoden

- `logger.error(message, error?, context?)` - Für Fehler
- `logger.warn(message, context?)` - Für Warnungen
- `logger.info(message, context?)` - Für Informationen
- `logger.debug(message, context?)` - Nur in Development

## PM2 Logging

PM2 ist so konfiguriert, dass alle Logs in `logs/` gespeichert werden:

```bash
# Logs anzeigen
pm2 logs konto-planer

# Nur Error-Logs
pm2 logs konto-planer --err

# Nur Output-Logs
pm2 logs konto-planer --out
```

## Error-Handler

### Client-Side Errors

- `src/app/error.tsx` - Behandelt normale Fehler
- `src/app/global-error.tsx` - Behandelt kritische Fehler

Beide senden Fehler automatisch an `/api/error-log`.

### Server-Side Errors

- Uncaught Exceptions werden automatisch geloggt
- Unhandled Promise Rejections werden automatisch geloggt

## Log-Format

Jeder Log-Eintrag ist ein JSON-Objekt:

```json
{
  "timestamp": "2025-01-XX...",
  "level": "error",
  "message": "Fehler beim Laden der Daten",
  "error": {
    "name": "Error",
    "message": "...",
    "stack": "..."
  },
  "context": {
    "endpoint": "/api/example",
    "userId": "user@example.com"
  }
}
```

## Log-Rotation

Für Produktionsumgebungen sollte ein Log-Rotation-Tool verwendet werden:

```bash
# Mit logrotate (Linux)
# Erstelle /etc/logrotate.d/konto-planer
/path/to/konto-planer/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

## Fehlerbehebung

### Logs nicht sichtbar?

1. Prüfe, ob das `logs/` Verzeichnis existiert
2. Prüfe Dateiberechtigungen: `chmod 755 logs/`
3. Prüfe PM2-Logs: `pm2 logs konto-planer`

### Zu viele Logs?

- Setze `NODE_ENV=production` - Debug-Logs werden dann nicht geschrieben
- Implementiere Log-Rotation
- Prüfe regelmäßig die Log-Größe

