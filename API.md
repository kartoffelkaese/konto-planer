# API

HTTP-JSON-API der KontoPlaner-Webapp. Gedacht für den eingebauten Next.js-Client (Session-Cookies), nicht als öffentliche Drittanbieter-API.

## Authentifizierung

Geschützte Routen erwarten eine **gültige NextAuth-Session** (Cookie `credentials: 'include'` bei `fetch` aus dem Browser).

```http
401 Unauthorized
```

```json
{ "error": "Nicht autorisiert" }
```

**Ohne Session erreichbar:**

| Pfad | Beschreibung |
|------|----------------|
| `/api/auth/*` | NextAuth (Login, Session, …) |
| `POST /api/auth/register` | Registrierung |

Anmeldung in der App: `/auth/login` (Credentials). Es gibt **keinen** Bearer-Token-Header.

## Konventionen

- `Content-Type: application/json` bei POST/PATCH
- Beträge: positiv = Einnahme, negativ = Ausgabe
- Datumsfelder: ISO-8601
- Wiederholung: `recurringInterval` z. B. `monthly`, `quarterly`, `yearly`

## Endpunkte

### Dashboard

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `GET` | `/api/dashboard` | Kennzahlen, Kategorieverteilung, wiederkehrende Zahlungen (30 Tage) |

### Transaktionen

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `GET` | `/api/transactions` | Paginierte Liste |
| `POST` | `/api/transactions` | Anlegen |
| `GET` | `/api/transactions/:id` | Einzelbuchung |
| `PATCH` | `/api/transactions/:id` | Aktualisieren (inkl. `isConfirmed`, `lastConfirmedDate`) |
| `DELETE` | `/api/transactions/:id` | Löschen |
| `GET` | `/api/transactions/recurring` | Alle wiederkehrenden Vorlagen |
| `GET` | `/api/transactions/totals` | Summen fürs Konto/Gehaltsmonat |
| `POST` | `/api/transactions/create-pending` | Fällige ausstehende Instanzen erzeugen |
| `POST` | `/api/transactions/:id/create-instance` | Instanz einer wiederkehrenden Buchung |

**`GET /api/transactions` – Query**

| Parameter | Beschreibung |
|-----------|----------------|
| `page` | Seite (Standard: 1) |
| `limit` | Einträge pro Seite (Standard: 20, max. 100) |
| `salaryDay` | Gehaltstag (1–31), mit `filterSalaryMonth` |
| `filterSalaryMonth` | `true` = nur aktueller Gehaltsmonat |

Antwort: `{ transactions, total, page, hasMore }`

**`POST /api/transactions` – Body (Auszug)**

`merchant`, `merchantId?`, `description?`, `amount`, `date`, `isRecurring?`, `recurringInterval?`

**`GET /api/transactions/totals` – Query**

`salaryDay` (Standard: 23)

Antwort: `currentIncome`, `currentExpenses`, `totalIncome`, `totalExpenses`, `totalPendingExpenses`, `available`

### Kategorien

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `GET` | `/api/categories` | Alle Kategorien des Nutzers |
| `POST` | `/api/categories` | Anlegen (`name`, `color`) |
| `GET` | `/api/categories/:id` | Details |
| `PATCH` | `/api/categories/:id` | Ändern |
| `DELETE` | `/api/categories/:id` | Löschen |

### Händler

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `GET` | `/api/merchants` | Alle Händler (inkl. Kategorie) |
| `POST` | `/api/merchants` | Anlegen (`name`, `categoryId?`) |
| `GET` | `/api/merchants/:id` | Details |
| `PATCH` | `/api/merchants/:id` | Ändern |
| `DELETE` | `/api/merchants/:id` | Löschen |

### Statistiken

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `GET` | `/api/statistics` | Monatliche Ausgaben-Serie für Charts |

**Query:** `category?`, `merchant?`, `timeRange` (`1month` \| `3months` \| `6months` \| `1year` \| `custom`), bei `custom` zusätzlich `startDate`, `endDate`

Antwort: Array `{ date, amount, category, color }` (Monatsschlüssel `YYYY-MM`)

### Nutzer & Konto

| Methode | Pfad | Beschreibung |
|---------|------|----------------|
| `GET` | `/api/users/settings` | `salaryDay`, `accountName`, … |
| `PATCH` | `/api/users/settings` | `salaryDay`, `accountName` |
| `PATCH` | `/api/users/email` | E-Mail ändern (mit Passwort) |
| `DELETE` | `/api/users/delete` | Konto löschen (mit Passwort) |

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
| `404` | Ressource nicht gefunden |
| `429` | Rate-Limit (Registrierung, Error-Log, Login) |
| `500` | Serverfehler |

Fehlerantworten sind meist `{ "error": "…" }` oder `{ "message": "…" }` (Registrierung).

## Client-Beispiel (Browser)

```typescript
const res = await fetch('/api/transactions?page=1&limit=20', {
  credentials: 'include',
})
if (!res.ok) throw new Error('Nicht autorisiert oder Fehler')
const data = await res.json()
```

Weitere Infos zum Projekt: [README.md](README.md)
