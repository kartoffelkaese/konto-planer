# KontoPlaner

Eine moderne Webanwendung zur Verwaltung von Finanzen, entwickelt mit Next.js 14, TypeScript und Tailwind CSS.

## Features

- 📊 **Dashboard**
  - Übersichtliche Darstellung von Einnahmen und Ausgaben
  - Visualisierung der Ausgabenverteilung in Kategorien
  - Anzeige der nächsten fälligen wiederkehrenden Zahlungen
  - Einnahmenberechnung basierend auf dem konfigurierten Gehaltsmonat

- 💰 **Transaktionen**
  - Erfassung von Einnahmen und Ausgaben
  - Kategorisierung von Transaktionen
  - Zuordnung zu Händlern
  - Detaillierte Transaktionsübersicht

- 🔄 **Wiederkehrende Zahlungen**
  - Verwaltung von regelmäßigen Einnahmen und Ausgaben
  - Flexible Konfiguration von Zahlungsintervallen
  - Übersicht der nächsten fälligen Zahlungen
  - Automatische Berechnung des nächsten Zahlungsdatums

- 🏷️ **Kategorien**
  - Individuelle Kategorisierung von Transaktionen
  - Farbkodierung für bessere Übersichtlichkeit
  - Hierarchische Kategorieverwaltung

- 🏪 **Händler**
  - Verwaltung von Händlern und Geschäften
  - Automatische Vorschläge bei Transaktionseingabe
  - Zuordnung von Händlern zu Kategorien

- ⚙️ **Einstellungen**
  - Konfiguration des Gehaltsmonats
  - Anpassung der Kategorien und Händler
  - Benutzerdefinierte Einstellungen

## Technologie-Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Datenbank**: PostgreSQL mit Prisma ORM
- **Authentifizierung**: NextAuth.js
- **Visualisierung**: Chart.js
- **Styling**: Tailwind CSS, Heroicons

## Installation

1. Repository klonen:
   ```bash
   git clone https://github.com/kartoffelkaese/konto-planer.git
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
   Bearbeiten Sie die `.env.local` Datei mit Ihren Datenbank- und Authentifizierungsdaten.

4. Datenbank initialisieren:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Entwicklungsserver starten:
   ```bash
   npm run dev
   ```

## Entwicklung

- `npm run dev`: Startet den Entwicklungsserver
- `npm run build`: Erstellt die Produktionsversion
- `npm run start`: Startet die Produktionsversion
- `npm run lint`: Führt den Linter aus
- `npm run format`: Formatiert den Code mit Prettier

## Lizenz

GPL-3.0

## Version

Aktuelle Version: 2.8.0

Siehe [CHANGELOG.md](CHANGELOG.md) für detaillierte Änderungsinformationen.
