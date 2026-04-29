# API Dokumentation

## Authentifizierung
Alle API-Endpunkte erfordern eine gültige Authentifizierung. Die Authentifizierung erfolgt über einen Bearer Token im Authorization Header.

```
Authorization: Bearer <token>
```

## Endpunkte

### Transaktionen

#### GET /api/transactions
Ruft alle Transaktionen ab.

**Query Parameter:**
- `month`: (optional) Format YYYY-MM - Filtert nach Monat
- `type`: (optional) "income" | "expense" - Filtert nach Transaktionstyp

**Antwort:**
```json
{
  "transactions": [
    {
      "id": string,
      "amount": number,
      "description": string,
      "date": string, // ISO 8601
      "type": "income" | "expense",
      "category": string,
      "isRecurring": boolean,
      "recurringInterval": "monthly" | "yearly" | null
    }
  ]
}
```

#### POST /api/transactions
Erstellt eine neue Transaktion.

**Body:**
```json
{
  "amount": number,
  "description": string,
  "date": string, // ISO 8601
  "type": "income" | "expense",
  "category": string,
  "isRecurring": boolean,
  "recurringInterval": "monthly" | "yearly" | null
}
```

#### PUT /api/transactions/:id
Aktualisiert eine bestehende Transaktion.

**URL Parameter:**
- `id`: Transaction ID

**Body:** Gleich wie POST /api/transactions

#### DELETE /api/transactions/:id
Löscht eine Transaktion.

**URL Parameter:**
- `id`: Transaction ID

### Wiederkehrende Transaktionen

#### GET /api/recurring
Ruft alle wiederkehrenden Transaktionen ab.

**Antwort:**
```json
{
  "transactions": [
    {
      "id": string,
      "amount": number,
      "description": string,
      "nextDate": string, // ISO 8601
      "type": "income" | "expense",
      "category": string,
      "recurringInterval": "monthly" | "yearly"
    }
  ]
}
```

#### POST /api/recurring/confirm/:id
Bestätigt eine wiederkehrende Transaktion für den aktuellen Zeitraum.

**URL Parameter:**
- `id`: Transaction ID

**Body:**
```json
{
  "confirmedDate": string // ISO 8601
}
```

### Kategorien

#### GET /api/categories
Ruft alle verfügbaren Kategorien ab.

**Antwort:**
```json
{
  "categories": [
    {
      "id": string,
      "name": string,
      "type": "income" | "expense"
    }
  ]
}
```

#### POST /api/categories
Erstellt eine neue Kategorie.

**Body:**
```json
{
  "name": string,
  "type": "income" | "expense"
}
```

### Statistiken

#### GET /api/statistics/monthly
Ruft die monatliche Übersicht ab.

**Query Parameter:**
- `month`: Format YYYY-MM

**Antwort:**
```json
{
  "totalIncome": number,
  "totalExpenses": number,
  "balance": number,
  "categoryBreakdown": {
    [category: string]: number
  }
}
```

## Fehlercodes

- `400`: Ungültige Anfrage
- `401`: Nicht authentifiziert
- `403`: Keine Berechtigung
- `404`: Ressource nicht gefunden
- `500`: Serverfehler

## Beispiele

### Neue Transaktion erstellen

```typescript
const response = await fetch('/api/transactions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    amount: 1000,
    description: "Gehalt",
    date: "2024-03-01T00:00:00.000Z",
    type: "income",
    category: "Gehalt",
    isRecurring: true,
    recurringInterval: "monthly"
  })
});
```

### Monatliche Statistiken abrufen

```typescript
const month = "2024-03";
const response = await fetch(`/api/statistics/monthly?month=${month}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
``` 