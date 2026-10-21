# Konto-Planer

Webapp zur Verwaltung persönlicher Finanzen: mehrere Konten, Transaktionen, Kategorien, Gehaltsmonat, wiederkehrende Zahlungen, Auswertungen und gemeinsame Split-Listen.

**Stack:** Next.js 16 · React 19 · Tailwind CSS 4 · Prisma 7 · MySQL/MariaDB · NextAuth.js v5

## Funktionen

- Mehrere Buchführungs-Konten mit Bank-Logo und Wechsel in der Navigation
- **Planungskonto:** Dashboard mit Kategorien, wiederkehrende Zahlungen (monatlich, vierteljährlich, halbjährlich, jährlich) – je Konto automatisch eingetragen zu Beginn des Gehaltsmonats oder am Buchungstag (oder von Hand), Gehaltsmonat, Bestätigungs-Workflow, Verfügbar-Saldo inkl. noch nicht eingetragener Zahlungen
- **Einfaches Konto:** reduzierte Ansicht für Sparkonten/Depots (Saldo, Kalendermonat, letzte Buchungen)
- Transaktionen, Umbuchungen zwischen Konten, CSV-Import (DKB, ING)
- **Wiederkehrende Zahlungen aus dem Kontoauszug erkennen:** Bank-Export der letzten 18 Monate hochladen (Einführung beim ersten Besuch von „Wiederkehrend“), die App schlägt regelmäßige Einnahmen und Ausgaben vor (inkl. schwankender Beträge, beendeter Verträge und Gehaltstag); die Datei wird nur ausgewertet, nicht gespeichert
- Statistiken mit getrennter Darstellung von Einnahmen und Ausgaben pro Monat
- Kategorien und Händler; geteilte Konten (OWNER, MEMBER, Nur-Lese)
- **Split-Budget:** gemeinsame Ausgabenlisten, Salden, Ausgleich, E-Mail-Einladungen, **öffentliche Lese-Links** (`/split/s/…`)
- **Split-Ausgleich:** Teilzahlungen und freie Zahlungen zwischen beliebigen Teilnehmern (Betrag, Datum, Notiz); Ausgleichszahlungen in der Historie löschbar
- **Split-Fremdwährungen:** optional bis zu 5 Währungen pro Liste (Frankfurter v2), Umrechnung in Euro, Originalbetrag unter dem Euro-Betrag; Währungen schon beim Anlegen der Liste wählbar
- Backup/Restore, Konto zurücksetzen (Buchungen, wahlweise mit wiederkehrenden Zahlungen, Kategorien und Händlern), Hell-/Dunkel-/System-Modus, Registrierung per E-Mail
- **Benutzerlevel (optional):** „Start“ (kostenlos, ein Konto) und „Komplett“ (alles), 14 Tage Testphase, Verwaltung für Admins, „Komplett“ als Abo über Stripe – ohne `PLANS_ENABLED` haben alle Nutzer den vollen Umfang
- Eigene Rechtstexte (Impressum, Datenschutz, AGB, Widerruf) als Dateien unter `content/legal/`

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
| `npm run audit:check` | npm audit der Laufzeit-Pakete (nur High/Critical); `npm run audit:all` bezieht Entwicklungswerkzeuge ein |
| `npm run db:migrate` | Migrationen (Produktion) |
| `npm run db:migrate:dev` | Migrationen (Entwicklung) |
| `npm run set-admin <E-Mail>` | Admin-Recht für die Verwaltung vergeben (`--remove` entzieht es) |
| `npm run stripe:setup` | Stripe-Produkt, Preise und Kundenportal anlegen (siehe INSTALL.md) |
| `npm run stripe:cleanup` | Vor dem Live-Gang: Nutzer mit Sandbox-Kunden anzeigen, mit `-- --apply` deren Stripe-Felder leeren |
| `npm run email:preview` | Alle E-Mails als HTML- und Text-Dateien nach `.email-preview/` schreiben (ohne Versand) |
| `npm run release 9.4.5` | Typecheck, Lint, Tests; dann Version setzen, alles committen (Nachricht = Version) und pushen |

`postinstall` führt `prisma generate` aus. Der Ordner `prisma/node_modules/` gehört **nicht** ins Repository (veralteter Prisma-Client).

Weitere Details: [INSTALL.md](INSTALL.md) (Server, Benutzerlevel, Stripe) · [API.md](API.md) · [LOGGING.md](LOGGING.md) · [DESIGN.md](DESIGN.md) (Gestaltungsregeln)

## Lizenz

GPL-3.0 – siehe [LICENSE](LICENSE).
