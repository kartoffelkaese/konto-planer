# Konto-Planer

Eine moderne Web-Anwendung zur Verwaltung von Einnahmen und Ausgaben, mit Fokus auf wiederkehrende Zahlungen und Kategorisierung.

## Version

Aktuelle Version: 2.3.0

## Features

- 📊 Übersichtliche Darstellung von Einnahmen und Ausgaben
- 🔄 Verwaltung von wiederkehrenden Zahlungen
- 📅 Automatische Erstellung ausstehender Zahlungen
- 🏷️ Kategorisierung von Händlern und Transaktionen
- 💰 Echtzeit-Aktualisierung des Kontostands
- 📱 Responsive Design für Desktop und Mobile
- 🔒 Sichere Authentifizierung
- 🎨 Modernes und intuitives Interface

## Neue Features in Version 2.3.0

- ⚡️ Automatische Aktualisierung der Transaktionsübersicht nach jeder Änderung
- 🔄 Verbessertes Handling von Transaktionsänderungen
- 🐛 Verbesserte Fehlerbehandlung
- 🎨 Optimierte Darstellung von Kategorien in der Transaktionsliste

## Technologien

- Next.js 14
- React 18
- TypeScript
- Prisma
- MySQL
- TailwindCSS
- NextAuth.js

## Installation

1. Repository klonen
```bash
git clone [repository-url]
```

2. Abhängigkeiten installieren
```bash
npm install
```

3. Umgebungsvariablen konfigurieren
```bash
cp .env.example .env
```

4. Datenbank-Migrationen ausführen
```bash
npx prisma migrate dev
```

5. Entwicklungsserver starten
```bash
npm run dev
```

## PM2 Deployment

### Installation

1. Installieren Sie PM2 global:
```bash
npm install -g pm2
```

2. Bauen Sie die Anwendung:
```bash
npm run build
```

### PM2 Befehle

- Starten der Anwendung:
```bash
npm run pm2:start
```

- Stoppen der Anwendung:
```bash
npm run pm2:stop
```

- Neustarten der Anwendung:
```bash
npm run pm2:restart
```

- Logs anzeigen:
```bash
npm run pm2:logs
```

- Monitoring:
```bash
npm run pm2:monitor
```

### Automatischer Start nach Systemneustart

1. Generieren Sie den Startup-Befehl:
```bash
pm2 startup
```

2. Speichern Sie die aktuelle Prozessliste:
```bash
pm2 save
```

### Konfiguration

Die PM2-Konfiguration befindet sich in `ecosystem.config.js`. Hier können Sie:
- Anzahl der Instanzen anpassen
- Umgebungsvariablen setzen
- Ressourcenlimits konfigurieren
- Monitoring-Optionen einstellen

## Entwicklung

- `npm run dev` - Startet den Entwicklungsserver
- `npm run build` - Erstellt eine Production-Build
- `npm run start` - Startet die Production-Version
- `npm run lint` - Führt den Linter aus

## Lizenz

Privat - Alle Rechte vorbehalten
