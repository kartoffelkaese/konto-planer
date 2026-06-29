# API

HTTP-JSON-API der Konto-Planer-Webapp. Gedacht für den eingebauten Next.js-Client (Session-Cookies), nicht als öffentliche Drittanbieter-API.

## Authentifizierung

Geschützte Routen erwarten eine **gültige NextAuth-Session** (`credentials: 'include'` bei `fetch`).

```http
401 Unauthorized
```

```json
{ "error": "Nicht autorisiert" }
```

**Ohne Session erreichbar:** `/api/auth/*`, `POST /api/auth/register`, `/api/split/public/*`

Öffentliche Split-Share-Seite im Browser: `/split/s/{token}` (nur Lesen, kein Login).

Anmeldung: `/auth/login` (Credentials). Es gibt **keinen** Bearer-Token-Header.

**E-Mail-Bestätigung:** Nach Registrierung ist `emailVerified` leer, bis der Link in der E-Mail geklickt wurde (24 h gültig). Login vor Bestätigung → Fehler. Unbestätigte Konten ohne gültigen Token werden per Cleanup-Skript gelöscht (`npm run db:cleanup-unverified`).

## Kontext & Berechtigungen

- Die meisten Endpunkte beziehen sich auf das **aktive Buchführungs-Konto** (`activeAccountId` in der Session).
- Kategorien, Händler und Transaktionen gehören zum aktiven Konto, nicht global zum Nutzer.
- Schreibzugriff: Rollen `OWNER` und `MEMBER`. Rolle `READ_ONLY` → **`403`** bei POST/PATCH/DELETE.
- Kontowechsel: `PATCH /api/accounts/active` mit `{ "accountId": "…" }`, danach Session per `update()` aktualisieren.

## Konventionen

- `Content-Type: application/json` bei POST/PATCH/DELETE (wo Body erwartet)
- Beträge: positiv = Einnahme, negativ = Ausgabe
- Datumsfelder: ISO-8601
- Wiederholung: `recurringInterval` z. B. `monthly`, `quarterly`, `yearly`

## Einfaches Konto (`isSimpleAccount`)

Wenn das aktive Konto als **einfaches Konto** markiert ist:

- Dashboard: Kalendermonat, `monthLabel`, `recentTransactions`; keine Kategorien/Recurring-Daten
- **`403`** für wiederkehrende Planungs-Endpunkte (`/api/transactions/recurring`, `create-pending`, `create-instance`)
- **`400`/`403`** bei `POST/PATCH` mit `isRecurring: true` bzw. Recurring-Feldern
- Aktivierung per `PATCH /api/users/settings` nur als **OWNER**; blockiert, solange Recurring-Templates existieren

## Endpunkte

### Dashboard

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `GET` | `/api/dashboard` | Kennzahlen fürs aktive Konto |

**Planungskonto:** `monthlyIncome`, `monthlyExpenses`, `totalBalance`, `clearedBalance`, `available`, `totalPendingExpenses`, `categoryDistribution`, `categoryPeriod`, `monthLabel`, `recurringTransactions` (30 Tage), `recentTransactions` (max. 6)

**Einfaches Konto:** `monthlyIncome`, `monthlyExpenses`, `totalBalance`, `monthLabel`, `recentTransactions` (max. 6); übrige Planungsfelder leer bzw. `0`

### Transaktionen

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `GET` | `/api/transactions` | Paginierte Liste |
| `POST` | `/api/transactions` | Anlegen |
| `GET` | `/api/transactions/:id` | Einzelbuchung |
| `PATCH` | `/api/transactions/:id` | Aktualisieren (inkl. `isConfirmed`, `lastConfirmedDate`, Umbuchung) |
| `DELETE` | `/api/transactions/:id` | Löschen |
| `GET` | `/api/transactions/recurring` | Wiederkehrende Vorlagen (Planungskonto) |
| `GET` | `/api/transactions/totals` | Summen fürs Konto/Gehaltsmonat |
| `POST` | `/api/transactions/create-pending` | Fällige ausstehende Instanzen erzeugen |
| `POST` | `/api/transactions/:id/create-instance` | Instanz einer wiederkehrenden Buchung |

**`GET /api/transactions` – Query**

| Parameter | Beschreibung |
|-----------|----------------|
| `page` | Seite (Standard: 1) |
| `limit` | Einträge pro Seite (Standard: 20, max. 100) |
| `q` | Suche in Händler/Beschreibung |
| `period` | Zeitraum: `all` (Standard), `current` (Gehalts-/Kalendermonat), `custom` |
| `startDate` | Bei `period=custom`: Start (ISO `YYYY-MM-DD`) |
| `endDate` | Bei `period=custom`: Ende (ISO `YYYY-MM-DD`) |
| `salaryDay` | Gehaltstag (1–31), für `period=current` |
| `filterSalaryMonth` | **Legacy** – `true` oder `1` entspricht `period=current` |

Antwort: `{ transactions, total, page, hasMore }`

**`POST /api/transactions` – Body (Auszug)**

`merchant`, `merchantId?`, `createNewMerchant?`, `description?`, `amount`, `date`, `categoryId?`, `isRecurring?`, `recurringInterval?`, `isTransfer?`, `transferTargetAccountId?`

### CSV-Import

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `POST` | `/api/transactions/import/preview` | CSV-Text parsen, Händler matchen, Duplikate prüfen (nur im Importzeitraum) |
| `POST` | `/api/transactions/import` | Ausgewählte Zeilen als Buchungen anlegen |

**`POST /api/transactions/import/preview` – Body**

- `csvText` (string) – Inhalt der CSV-Datei (UTF-8, typisch `;`-getrennt)
- `formatId` (optional) – CSV-Format manuell wählen (Override); sonst aus `account.bankId` via Mapping

**Bank → Format:** Das Konto muss eine Bank in den Einstellungen haben (`bankId`). Unterstützte Zuordnungen siehe `src/lib/csvImport/bankFormats.ts`. Fehlt die Bank oder das Mapping → Fehler (kein Fallback auf anderes Format).

**Formate:**

| formatId | Bank(en) | Spalten (Kern) |
|----------|----------|----------------|
| `dkbExport` | DKB | `Buchungsdatum`, `Status`, `Zahlungspflichtige*r`, `Zahlungsempfänger*in`, `Verwendungszweck`, `Umsatztyp`, `Betrag (€)` |
| `ingExport` | ING | `Datum`, `Empfänger/Auftraggeber`, `Verwendungszweck`, `Betrag` (vorzeichenbehaftet) |

Antwort: `{ formatId, formatLabel, bankId, bankName, headerMismatch?, availableFormats, rows, merchants, summary }` – `rows` sind **nach Datum aufsteigend** sortiert; `headerMismatch: true` wenn CSV-Spalten nicht zum gewählten Format passen; `summary.confirmable` zählt bestätigbare Duplikate und wiederkehrende Zeilen; `summary.recurring` zählt erkannte wiederkehrende Treffer; `summary.dateRange` – Duplikatprüfung nur in diesem Bereich

**Bestätigungs-Flow (Duplikat + CSV „Gebucht“ + DB offen):** `canConfirmDuplicate: true` – keine Neuanlage; Commit mit `confirmExistingId` setzt nur `isConfirmed: true` auf der bestehenden Transaktion.

**Wiederkehrend-Flow (nur Planungskonten, CSV „Gebucht“):** Passende Vorlage oder Instanz im Gehaltsmonat – kein normaler Import. `recurringMatchKind`: `confirmExisting` (offene Instanz bestätigen), `createAndConfirm` (Instanz anlegen und als gebucht markieren), `alreadyBooked` (nur Hinweis). Commit: `{ rowIndex, confirmExistingId }` (Instanz) oder `{ rowIndex, confirmRecurringTemplateId, date, amount }` (neue Instanz).

**`POST /api/transactions/import` – Body**

`rows`: Array – nur vom Client freigegebene Zeilen:

- **Neu importieren:** `{ rowIndex, date, amount, description?, merchantId?, merchant?, createNewMerchant?, categoryId?, isConfirmed }`
- **Bestehende bestätigen:** `{ rowIndex, confirmExistingId }` – aus Preview (`duplicateTransactionId` oder `recurringInstanceId`)
- **Wiederkehrend anlegen und bestätigen:** `{ rowIndex, confirmRecurringTemplateId, date, amount }`

Antwort: `{ created, confirmed, skipped, errors }`

Schreibzugriff auf das aktive Konto erforderlich (nicht `READ_ONLY`).

**`GET /api/transactions/totals` – Query**

| Parameter | Beschreibung |
|-----------|----------------|
| `period` | Wie bei `GET /api/transactions`; bei `all` KPI-Einnahmen/Ausgaben für aktuellen Gehalts- bzw. Kalendermonat |
| `startDate` / `endDate` | Bei `period=custom` |
| `salaryDay` | Optional (sonst Gehaltstag des Kontos) |

Antwort: `currentIncome`, `currentExpenses`, `totalIncome`, `totalExpenses`, `clearedBalance`, `totalPendingExpenses`, `available`, `periodLabel`

### Buchführungs-Konten

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `GET` | `/api/accounts` | Alle Konten des Nutzers (`id`, `name`, `role`, `isActive`, `bankId`, `isSimpleAccount`, …) |
| `POST` | `/api/accounts` | Neues Konto (`name`, `bankId?`, `salaryDay?`, `isSimpleAccount?`) |
| `GET` | `/api/accounts/active` | Aktives Konto inkl. Rolle |
| `PATCH` | `/api/accounts/active` | Konto wechseln (`accountId`) oder Name/Gehaltstag ändern |
| `DELETE` | `/api/accounts/:id` | Aktives Konto löschen (nur OWNER, nicht das letzte) |
| `GET` | `/api/accounts/transfer-targets` | Zielkonten für Umbuchungen |

### Teilen & Einladungen

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `GET` | `/api/accounts/:id/members` | Mitglieder & offene Einladungen (OWNER) |
| `POST` | `/api/accounts/:id/members` | Einladen (`email`, `role`: `MEMBER` \| `READ_ONLY`) |
| `PATCH` | `/api/accounts/:id/members` | Rolle ändern (`memberId`, `role`) |
| `DELETE` | `/api/accounts/:id/members` | Mitglied entfernen oder Einladung widerrufen (`memberId` \| `inviteId`) |
| `GET` | `/api/invites/received` | Eigene offene Einladungen |
| `PATCH` | `/api/invites/:id` | Annehmen/Ablehnen (`action`: `accept` \| `decline`) |

### Navigation

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `GET` | `/api/nav-badges` | `unconfirmedTransactions`, `recurringAttention`, `pendingInvitations`, `pendingSplitInvitations` |

### Kategorien

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `GET` | `/api/categories` | Alle Kategorien des **aktiven Kontos** |
| `POST` | `/api/categories` | Anlegen (`name`, `color`) |
| `GET` | `/api/categories/:id` | Details |
| `PATCH` | `/api/categories/:id` | Ändern |
| `DELETE` | `/api/categories/:id` | Löschen |

### Händler

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `GET` | `/api/merchants` | Alle Händler des aktiven Kontos |
| `POST` | `/api/merchants` | Anlegen (`name`, `categoryId?` oder `categoryIds?`) |
| `GET` | `/api/merchants/:id` | Details |
| `PATCH` | `/api/merchants/:id` | Ändern |
| `DELETE` | `/api/merchants/:id` | Löschen |

### Statistiken

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `GET` | `/api/statistics` | Monatliche Einnahmen- und Ausgaben-Serie für Charts (Planungskonten) |

**Query:** `category?`, `merchant?`, `timeRange` (`1month` \| `3months` \| `6months` \| `1year` \| `custom`), bei `custom` zusätzlich `startDate`, `endDate`

Antwort: Array `{ date, income, expenses, net, category, color }` (Monatsschlüssel `YYYY-MM`). Positive Buchungen zählen als `income`, negative als `expenses` (Betrag absolut). `net` = Einnahmen minus Ausgaben.

Nur für Konten mit `isSimpleAccount: false` (Statistik-Seite leitet sonst um).

### Nutzer & Kontoeinstellungen

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `GET` | `/api/users/settings` | Einstellungen des **aktiven Kontos** |
| `PATCH` | `/api/users/settings` | Einstellungen ändern (Schreibzugriff nötig) |
| `PATCH` | `/api/users/email` | Neue E-Mail anfordern (Passwort); Bestätigungslink an neue Adresse |
| `DELETE` | `/api/users/email/pending` | Ausstehende E-Mail-Änderung abbrechen |
| `POST` | `/api/users/email/resend` | Bestätigungs-E-Mail für ausstehende Änderung erneut senden |
| `DELETE` | `/api/users/delete` | Anmeldung löschen (mit Passwort) |

**`GET/PATCH /api/users/settings` – Felder**

`email`, `accountName`, `salaryDay`, `transferSenderName`, `splitDisplayName`, `bankId`, `isSimpleAccount`, `activeAccountId`, `role`, `createdAt`, `pendingEmail`

**`PATCH` – Body:** `accountName`, `salaryDay`, `transferSenderName`, `bankId`, `isSimpleAccount` (nur **OWNER**; Aktivierung nur ohne Recurring-Templates), `splitDisplayName` (nutzerweit, auch bei Nur-Lese-Konto speicherbar)

`bankId`: Slug aus dem Bank-Katalog (z. B. `ing`, `trade-republic`) oder `null`

### Backup

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `GET` | `/api/backup` | Export (JSON, Version `1.0`) |
| `POST` | `/api/backup` | Import validiertes Backup |

### Sonstiges

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `POST` | `/api/auth/register` | `email`, `password`, `salaryDay` — sendet Bestätigungs-E-Mail |
| `GET` | `/api/auth/verify-email?token=…` | E-Mail bestätigen (Redirect zur Anmeldung) |
| `POST` | `/api/auth/resend-verification` | `{ "email" }` — Bestätigungs-E-Mail erneut (Registrierung) |
| `POST` | `/api/error-log` | Client-Fehler ans Server-Log (Session, Rate-Limit) |

## Split-Budget (eigenes Modul)

Unabhängig vom Haushaltsbuch. Zugriff über **Session `user.id`**, nicht über `activeAccountId`.

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/api/split/lists` | Alle Split-Listen des Nutzers |
| `POST` | `/api/split/lists` | `{ name, description?, participantNames?, categoryNames? }` |
| `GET`/`PATCH`/`DELETE` | `/api/split/lists/:id` | Detail, archivieren/umbenennen, löschen (Owner) |
| `GET`/`PATCH`/`POST` | `/api/split/lists/:id/share` | Öffentlichen Lese-Link verwalten (nur **OWNER**) |
| `GET`/`POST`/`DELETE` | `/api/split/lists/:id/participants` | Teilnehmer verwalten; POST `{ displayName, email? }` |
| `GET`/`POST`/`PATCH`/`DELETE` | `/api/split/lists/:id/categories` | Kategorien pro Liste (getrennt von Haushalts-Kategorien) |
| `GET`/`POST`/`PATCH`/`DELETE` | `/api/split/lists/:id/expenses` | Ausgaben CRUD inkl. `categoryId`, `shareParticipantIds` |
| `GET` | `/api/split/lists/:id/balances` | Nettosalden + vereinfachte Schuldvorschläge |
| `GET`/`POST` | `/api/split/lists/:id/settlements` | Ausgleich abhaken |
| `GET` | `/api/split/lists/:id/history` | Ausgleiche + Gesamtausgaben (nach Kategorie) |
| `GET` | `/api/split/invites/received` | Offene Split-Einladungen |
| `PATCH` | `/api/split/invites/:id` | `{ action: "accept" \| "decline" }` |

Archivierte Listen: nur Lesen (`403` bei Schreibzugriff).

### Öffentlicher Share-Link (ohne Session)

Owner aktiviert den Link in den Split-Einstellungen. Token wird nur gehasht in der DB gespeichert; Klartext-URL nur beim Aktivieren oder Neu-Generieren.

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/api/split/lists/:id/share` | `{ shareEnabled, shareEnabledAt? }` (Owner) |
| `PATCH` | `/api/split/lists/:id/share` | `{ shareEnabled: true \| false }` — bei `true`: Antwort enthält `shareUrl`; bei `false`: Token wird gelöscht |
| `POST` | `/api/split/lists/:id/share` | Link neu generieren; Antwort: `{ shareEnabled, shareEnabledAt, shareUrl }` |
| `GET` | `/api/split/public/:token` | Listen-Metadaten für Gäste (ohne Rollen, E-Mails, Invite-Status) |
| `GET` | `/api/split/public/:token/expenses` | Ausgaben (read-only) |
| `GET` | `/api/split/public/:token/balances` | Salden und Schuldvorschläge |
| `GET` | `/api/split/public/:token/history` | Historie |

Share-URL: `{AUTH_URL}/split/s/{token}`

Ungültiger oder deaktivierter Token → **`404`** (kein Unterschied für den Client).

## Fehlercodes

| Code | Bedeutung |
|------|-----------|
| `400` | Ungültige Eingabe |
| `401` | Nicht angemeldet |
| `403` | Kein Zugriff / Nur-Lese / Planungsfunktion auf einfachem Konto |
| `404` | Ressource nicht gefunden |
| `429` | Rate-Limit (Registrierung, Error-Log, Login, Einladungen, Kontolöschung) |
| `500` | Serverfehler |

Fehlerantworten: meist `{ "error": "…" }` oder `{ "message": "…" }` (Registrierung).

## Client-Beispiel (Browser)

```typescript
const res = await fetch('/api/transactions?page=1&limit=20', {
  credentials: 'include',
})
if (!res.ok) throw new Error('Nicht autorisiert oder Fehler')
const data = await res.json()
```

Weitere Infos zum Projekt: [README.md](README.md)
