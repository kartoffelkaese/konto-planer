# Changelog

Alle wichtigen Änderungen am Projekt werden in dieser Datei dokumentiert.

## [2.5.1]

### Sicherheit
- Kritische Sicherheitsverbesserung: Anmeldedaten werden nicht mehr über URL-Parameter übertragen
- Implementierung zusätzlicher Sicherheitschecks im Authentifizierungsprozess
- Nur POST-Anfragen für Anmeldungen erlaubt
- Verbesserte Fehlerbehandlung
- Designänderungen

## [2.5.0]

### Hinzugefügt
- Neue Landing Page mit Feature-Übersicht
- Verbesserte Navigation für nicht eingeloggte Benutzer
- Einheitliches Design für alle Seiten

### Verbessert
- Überarbeitetes UI/UX-Design
- Optimierte Benutzerführung
- Konsistentere Navigation

### Geändert
- Angepasste Middleware für neue Landing Page
- Überarbeitete Routing-Logik

## [2.4.2]

### Verbessert
- Einheitliches Padding (0.25rem) für alle Input-Felder, Select-Boxen und Textareas
- Konsistentere Benutzeroberfläche durch standardisierte Eingabefelder

## [2.4.1]

### Verbessert
- Optimierte Darstellung der Eingabefelder
- Verbesserte Benutzerfreundlichkeit durch einheitliche Abstände

## [2.4.0]

### Hinzugefügt
- Spezielle Tablet-Ansicht für Transaktionen zwischen Desktop und Mobile
- Optimierte Darstellung für mittlere Bildschirmgrößen
- Verbesserte Datenpräsentation in der Tablet-Ansicht

### Verbessert
- Angepasstes Layout für verschiedene Bildschirmgrößen
- Optimierte Performance durch verbesserte Datenladezeiten
- Überarbeitete Responsive-Design-Breakpoints
- Kompaktere Darstellung der Transaktionsliste auf Tablets

### Geändert
- Neue Breakpoints für Desktop (>1024px), Tablet (768px-1024px) und Mobile (<768px)
- Reorganisation der Spalten für bessere Lesbarkeit auf Tablets 

## [2.3.0]

### Hinzugefügt
- Automatische Aktualisierung der Transaktionsübersicht nach jeder Änderung
- Echtzeit-Aktualisierung des Kontostands bei Transaktionsänderungen

### Verbessert
- Optimiertes Handling von Transaktionsänderungen
- Verbesserte Darstellung von Kategorien in der Transaktionsliste
- Bessere Fehlerbehandlung bei API-Aufrufen

### Behoben
- Problem mit nicht aktualisierten Summen nach Transaktionsänderungen
- Fehler bei der Anzeige von Kategoriefarben

## [2.2.1] - 2024-03-XX

### Verbessert
- Optimierte Darstellung der Händlerverwaltung
- Verbesserte Navigation auf mobilen Geräten

### Behoben
- Fehler bei der Verknüpfung von Transaktionen mit Händlern
- Problem mit der Anzeige von wiederkehrenden Zahlungen

## [2.2.0] - 2024-03-XX

### Hinzugefügt
- Kategorieverwaltung für Händler
- Farbliche Kennzeichnung von Kategorien
- Verbessertes Handling von wiederkehrenden Zahlungen

### Verbessert
- Überarbeitetes UI/UX-Design
- Optimierte Ladezeiten

### Behoben
- Verschiedene kleinere Bugfixes

## [2.1.0] - 2024-02-XX

### Hinzugefügt
- Händlerverwaltung
- Automatische Erstellung ausstehender Zahlungen
- Bestätigungssystem für Transaktionen

### Verbessert
- Performance-Optimierungen
- Bessere mobile Ansicht

## [2.0.0] - 2024-02-XX

### Hinzugefügt
- Komplette Neuimplementierung mit Next.js 14
- Neue Benutzeroberfläche mit TailwindCSS
- Verbesserte Authentifizierung mit NextAuth.js
- Prisma als ORM für bessere Datenbankintegration

### Geändert
- Migration von Express.js zu Next.js
- Überarbeitete Datenbankstruktur
- Moderneres UI/UX-Design

## [1.3.0]

### Hinzugefügt
- Möglichkeit zur Änderung der E-Mail-Adresse im Benutzerprofil
- Sicherheitsüberprüfung durch Passwortbestätigung bei E-Mail-Änderung
- Automatische Session-Aktualisierung nach E-Mail-Änderung

### Verbessert
- Benutzerfreundlichere Darstellung der Versionsnummer
- Überarbeitete Benutzereinstellungen mit separaten Bereichen
- Verbesserte Fehlerbehandlung und Validierung

## [1.2.2]

### Verbessert
- Bestätigungsprozess für Transaktionen überarbeitet
- Transaktionsdatum bleibt bei Bestätigung unverändert
- Korrekte Buchführung auch bei nachträglicher Bestätigung

## [1.2.1]

### Hinzugefügt
- Versionierung von wiederkehrenden Zahlungen
- Anzeige der Versionshistorie in der Transaktionsliste
- Versionsnummer in der Navigationsleiste
- Händlerfeld für bessere Kategorisierung von Transaktionen

### Verbessert
- Übersichtlichere Darstellung der monatlichen Belastung
- Detaillierte Aufschlüsselung nach Zahlungsintervallen (monatlich, vierteljährlich, jährlich)
- Kompaktere Darstellung der wiederkehrenden Zahlungen

### Behoben
- Korrektur der Berechnung des verfügbaren Betrags unter Berücksichtigung nicht bestätigter Ausgaben
- Verbessertes Handling von Datumsänderungen bei Transaktionen

## [1.2.0]

### Hinzugefügt
- Bestätigung von Transaktionen
- Status-Tracking (bestätigt, ausstehend, nicht bestätigt)
- Manuelles Setzen des Transaktionsdatums

### Verbessert
- Benutzeroberfläche für wiederkehrende Zahlungen
- Navigation und Layout-Struktur

## [1.1.0]

### Hinzugefügt
- Wiederkehrende Zahlungen
- Automatische Berechnung der monatlichen Belastung
- Verschiedene Zahlungsintervalle (monatlich, vierteljährlich, jährlich)

### Verbessert
- Responsives Design für mobile Geräte
- Filterfunktionen für Transaktionen

## [1.0.0]

### Erste Veröffentlichung
- Grundlegende Funktionen zur Finanzverwaltung
- Erfassung von Einnahmen und Ausgaben
- Monatliche Übersicht
- Benutzerverwaltung mit Kontoeinstellungen

## Version 1.3.2

### Verbesserungen
- Optimiertes Design der Kontobezeichnung auf der Transaktionsseite

## Version 1.3.1

### Verbesserungen
- Kompakteres Design der Monatsübersicht
- Optimierte Darstellung der Beträge neben den Beschriftungen
- Verbesserte Platznutzung in der Benutzeroberfläche

## [1.4.0]

### Hinzugefügt
- Moderne Modal-Dialoge für Transaktionsbearbeitung
- Verbesserte Benutzerinteraktion durch In-Page-Bearbeitung
- Optimierte Darstellung der Bearbeitungsformulare

### Verbessert
- Überarbeitete Benutzeroberfläche für Transaktionsbearbeitung
- Effizienterer Workflow durch Modal-Dialoge
- Reduzierte Seitenneuladezeiten durch In-Page-Updates