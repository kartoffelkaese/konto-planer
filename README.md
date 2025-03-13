# KontoPlaner

Eine moderne Webanwendung zur Verwaltung Ihrer persönlichen Finanzen, entwickelt mit Next.js 14 und TailwindCSS.

## Features

- 📊 **Dashboard**
  - Übersichtliche Darstellung von Einnahmen und Ausgaben
  - Visualisierung der Kategorieverteilung
  - Prognose für die nächsten 30 Tage
  - Anzeige wiederkehrender Zahlungen

- 💰 **Transaktionsverwaltung**
  - Erfassung von Einnahmen und Ausgaben
  - Kategorisierung von Transaktionen
  - Wiederkehrende Zahlungen (monatlich, vierteljährlich, jährlich)
  - Bestätigungssystem für Transaktionen
  - Manuelles Setzen des Transaktionsdatums

- 🏪 **Händlerverwaltung**
  - Verwaltung von Händlern und Geschäften
  - Automatische Kategorisierung basierend auf Händlern
  - Farbliche Kennzeichnung von Kategorien

- 🔄 **Automatisierung**
  - Automatische Erstellung ausstehender Zahlungen
  - Echtzeit-Aktualisierung des Kontostands
  - Automatische Kategorisierung basierend auf Händlern

- 📱 **Responsives Design**
  - Optimierte Ansicht für Desktop, Tablet und Mobile
  - Kollabierbare Navigation
  - Touch-freundliche Benutzeroberfläche

- 🔒 **Sicherheit**
  - Sichere Authentifizierung mit NextAuth.js
  - Verschlüsselte Datenübertragung
  - Datenschutzkonforme Implementierung

- ⚙️ **Einstellungen**
  - Anpassbare Kontobezeichnung
  - Konfigurierbarer Gehaltsmonat
  - E-Mail-Adressverwaltung
  - Backup-Funktionalität
  - Konto-Löschung

## Technologie-Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: Next.js API Routes
- **Datenbank**: MySQL mit Prisma ORM
- **Authentifizierung**: NextAuth.js
- **Styling**: TailwindCSS, Heroicons
- **Charts**: Chart.js, react-chartjs-2

## Installation

1. Repository klonen:
   ```bash
   git clone https://github.com/yourusername/konto-planer.git
   cd konto-planer
   ```

2. Abhängigkeiten installieren:
   ```bash
   npm install
   ```

3. Umgebungsvariablen konfigurieren:
   ```bash
   cp .env.example .env.local
   ```
   Bearbeiten Sie die `.env.local` Datei mit Ihren Konfigurationen.

4. Datenbank initialisieren:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Entwicklungsserver starten:
   ```bash
   npm run dev
   ```

## Umgebungsvariablen

Erstellen Sie eine `.env.local` Datei mit folgenden Variablen:

```env
DATABASE_URL="mysql://user:password@localhost:3306/konto_planer"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

## Lizenz

Dieses Projekt ist unter der GPL-3.0 Lizenz lizenziert. Siehe [LICENSE](LICENSE) für Details.

## Changelog

Alle Änderungen werden in der [CHANGELOG.md](CHANGELOG.md) dokumentiert.

## Beitragen

Beiträge sind willkommen! Bitte lesen Sie unsere [CONTRIBUTING.md](CONTRIBUTING.md) für Details zu unserem Code of Conduct und dem Prozess für Pull Requests.
