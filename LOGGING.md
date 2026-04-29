# Logging

Server- und API-Code nutzt [`src/lib/logger.ts`](src/lib/logger.ts): Ausgabe erfolgt über `console` (error, warn, info, debug). `debug` nur bei `NODE_ENV=development`.

## API-Routen

```typescript
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    // ...
  } catch (error) {
    logger.error('Fehler beim Laden der Daten', error, {
      endpoint: '/api/example',
      userId: session?.user?.email
    })
    return NextResponse.json({ error: 'Fehler' }, { status: 500 })
  }
}
```

## Methoden

- `logger.error(message, error?, context?)`
- `logger.warn(message, context?)`
- `logger.info(message, context?)`
- `logger.debug(message, context?)`

## Client-Fehler

[`src/app/error.tsx`](src/app/error.tsx) und [`src/app/global-error.tsx`](src/app/global-error.tsx) senden Fehler per `POST` an [`/api/error-log`](src/app/api/error-log/route.ts); dort wird mit `logger.error` protokolliert.

## PM2

Unter Produktion mit PM2: Logs siehe `npm run pm2:logs` bzw. Konfiguration in [`ecosystem.config.js`](ecosystem.config.js).
