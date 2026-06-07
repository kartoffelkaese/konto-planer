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

**Ohne Session erreichbar:** `/api/auth/*`, `POST /api/auth/register`

Anmeldung: `/auth/login` (Credentials). Es gibt **keinen** Bearer-Token-Header.

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

**Planungskonto:** `monthlyIncome`, `monthlyExpenses`, `totalBalance`, `savingsRate`, `recurringExpenses`, `categoryDistribution`, `categoryPeriod`, `recurringTransactions` (30 Tage)

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
| `salaryDay` | Gehaltstag (1–31), mit `filterSalaryMonth` |
| `filterSalaryMonth` | `true` = nur aktueller Gehaltsmonat |

Antwort: `{ transactions, total, page, hasMore }`

**`POST /api/transactions` – Body (Auszug)**

`merchant`, `merchantId?`, `createNewMerchant?`, `description?`, `amount`, `date`, `categoryId?`, `isRecurring?`, `recurringInterval?`, `isTransfer?`, `transferTargetAccountId?`

**`GET /api/transactions/totals` – Query**

`salaryDay` optional (sonst Gehaltstag des Kontos)

Antwort: `currentIncome`, `currentExpenses`, `totalIncome`, `totalExpenses`, `clearedBalance`, `totalPendingExpenses`, `available`

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
| `GET` | `/api/nav-badges` | `unconfirmedTransactions`, `recurringAttention`, `pendingInvitations` |

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
| `GET` | `/api/statistics` | Monatliche Ausgaben-Serie für Charts |

**Query:** `category?`, `merchant?`, `timeRange` (`1month` \| `3months` \| `6months` \| `1year` \| `custom`), bei `custom` zusätzlich `startDate`, `endDate`

Antwort: Array `{ date, amount, category, color }` (Monatsschlüssel `YYYY-MM`)

### Nutzer & Kontoeinstellungen

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `GET` | `/api/users/settings` | Einstellungen des **aktiven Kontos** |
| `PATCH` | `/api/users/settings` | Einstellungen ändern (Schreibzugriff nötig) |
| `PATCH` | `/api/users/email` | E-Mail ändern (mit Passwort) |
| `DELETE` | `/api/users/delete` | Anmeldung löschen (mit Passwort) |

**`GET/PATCH /api/users/settings` – Felder**

`email`, `accountName`, `salaryDay`, `transferSenderName`, `bankId`, `isSimpleAccount`, `activeAccountId`, `role`, `createdAt`

**`PATCH` – Body:** `accountName`, `salaryDay`, `transferSenderName`, `bankId`, `isSimpleAccount` (nur **OWNER**; Aktivierung nur ohne Recurring-Templates)

`bankId`: Slug aus dem Bank-Katalog (z. B. `ing`, `trade-republic`) oder `null`

### Backup

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `GET` | `/api/backup` | Export (JSON, Version `1.0`) |
| `POST` | `/api/backup` | Import validiertes Backup |

### Sonstiges

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `POST` | `/api/auth/register` | `email`, `password`, `salaryDay` |
| `POST` | `/api/error-log` | Client-Fehler ans Server-Log (Session, Rate-Limit) |

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
