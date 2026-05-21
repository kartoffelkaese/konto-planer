# KontoPlaner

Webapp zur Verwaltung persönlicher Finanzen: Transaktionen, Kategorien, Händler, Gehaltsmonat und Auswertungen.

**Stack:** Next.js 16 · React 19 · Tailwind CSS 4 · Prisma 7 · MySQL/MariaDB · NextAuth.js v5

## Funktionen

- Dashboard mit Kategorieverteilung und anstehenden wiederkehrenden Zahlungen
- Transaktionen (Einnahmen/Ausgaben), Bestätigung, Gehaltsmonat-Filter, unendliches Nachladen
- Wiederkehrende Buchungen (monatlich, vierteljährlich, jährlich) und automatische Ausstehende
- Statistiken nach Kategorie, Händler und Zeitraum
- Kategorien und Händler mit Farben; Zuordnung über Händler
- Einstellungen: Kontoname, Gehaltstag, Farbschema, E-Mail, Backup, Konto löschen
- Registrierung und Anmeldung (Credentials)

## Voraussetzungen

- Node.js 20+
- MySQL- oder MariaDB-Datenbank

## Lokale Entwicklung

```bash
npm install
cp .env.example .env
npx prisma generate
npm run db:migrate:dev   # Erstinstallation; bestehende DB: ggf. prisma migrate resolve
npm run dev
```

### Datenbank-Migrationen

| Befehl | Zweck |
|--------|--------|
| `npm run db:migrate:dev` | Entwicklung: Migration anwenden und Client neu generieren |
| `npm run db:migrate` | Produktion: `prisma migrate deploy` |
| `npm test` | Unit-Tests (Vitest) |

App: [http://localhost:3000](http://localhost:3000) (siehe `package.json` → `dev`)

### Umgebungsvariablen (Minimum)

| Variable | Beschreibung |
|----------|--------------|
| `DATABASE_URL` | MySQL/MariaDB-Verbindungs-URL |
| `AUTH_SECRET` oder `NEXTAUTH_SECRET` | Geheimer Schlüssel für Sessions |
| `AUTH_URL` oder `NEXTAUTH_URL` | Öffentliche Basis-URL (Produktion Pflicht) |

Weitere Details: [API.md](API.md) · Logging: [LOGGING.md](LOGGING.md)

## Skripte

| Befehl | Zweck |
|--------|--------|
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Produktions-Build |
| `npm run start` | Server (Port 3001, siehe `package.json`) |
| `npm run lint` | ESLint |
| `npm run pm2:start` | Produktion mit PM2 (`ecosystem.config.js`) |

## Dokumentation

- [API.md](API.md) – API-Endpunkte
- [LOGGING.md](LOGGING.md) – Protokollierung

## Lizenz

GPL-3.0 – siehe [LICENSE](LICENSE).
