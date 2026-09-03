# Konto-Planer

Webapp zur Verwaltung persönlicher Finanzen: mehrere Konten, Transaktionen, Kategorien, Gehaltsmonat, wiederkehrende Zahlungen, Auswertungen und gemeinsame Split-Listen.

**Stack:** Next.js 16 · React 19 · Tailwind CSS 4 · Prisma 7 · MySQL/MariaDB · NextAuth.js v5

## Funktionen

- Mehrere Buchführungs-Konten mit Bank-Logo und Wechsel in der Navigation
- **Planungskonto:** Dashboard mit Kategorien, wiederkehrende Zahlungen (monatlich, vierteljährlich, halbjährlich, jährlich), Gehaltsmonat, Bestätigungs-Workflow, Verfügbar-Saldo
- **Einfaches Konto:** reduzierte Ansicht für Sparkonten/Depots (Saldo, Kalendermonat, letzte Buchungen)
- Transaktionen, Umbuchungen zwischen Konten, CSV-Import (DKB, ING)
- Statistiken mit getrennter Darstellung von Einnahmen und Ausgaben pro Monat
- Kategorien und Händler; geteilte Konten (OWNER, MEMBER, Nur-Lese)
- **Split-Budget:** gemeinsame Ausgabenlisten, Salden, Ausgleich, E-Mail-Einladungen, **öffentliche Lese-Links** (`/split/s/…`)
- **Split-Fremdwährungen:** optional bis zu 5 Währungen pro Liste (Frankfurter v2), Umrechnung in Euro, Originalbetrag unter dem Euro-Betrag; Währungen schon beim Anlegen der Liste wählbar
- Backup/Restore, Farbschemata, Registrierung per E-Mail

## Lokale Entwicklung

```bash
npm install
# .env mit DATABASE_URL, AUTH_SECRET und AUTH_URL anlegen
npm run db:migrate:dev
npm run dev
```

App: [http://localhost:3000](http://localhost:3000) (Standard-Port von `next dev`)

| Befehl | Zweck |
|--------|--------|
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Prisma Client generieren, Client-Verify, TS-7-Typecheck, Next.js-Produktionsbuild |
| `npm run typecheck` | TypeScript 7 (`typescript-7`-Alias) |
| `npm test` | Unit-Tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run audit:check` | npm audit (nur High/Critical) |
| `npm run db:migrate` | Migrationen (Produktion) |
| `npm run db:migrate:dev` | Migrationen (Entwicklung) |

`postinstall` führt `prisma generate` aus. Der Ordner `prisma/node_modules/` gehört **nicht** ins Repository (veralteter Prisma-Client).

Weitere Details: [INSTALL.md](INSTALL.md) (Server) · [API.md](API.md) · [LOGGING.md](LOGGING.md)

## Lizenz

GPL-3.0 – siehe [LICENSE](LICENSE).
