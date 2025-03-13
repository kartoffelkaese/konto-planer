# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt adhäriert zu [Semantic Versioning](https://semver.org/lang/de/).

## [2.10.0]

### Hinzugefügt
- Backup-Funktionalität zum Erstellen und Wiederherstellen von Daten
- Möglichkeit zum Löschen des Benutzerkontos mit Bestätigungsdialog
- Neue API-Route für Backup-Operationen
- Neue API-Route für das Löschen des Benutzerkontos

### Geändert
- Verbesserte Struktur der Einstellungsseite
- Neue Reihenfolge der Einstellungsoptionen (Allgemeine Einstellungen, E-Mail, Backup, Konto löschen)

### Verbessert
- Sicherheitsmaßnahmen beim Löschen des Kontos (doppelte Bestätigung)
- Benutzerführung durch klare Warnungen und Bestätigungsdialoge
- Atomare Transaktionen bei kritischen Operationen

## [2.9.0]

### Geändert
- Weißer Hintergrund für das Löschbestätigungs-Modal
- Verbesserte Landing Page für nicht eingeloggte Benutzer

### Hinzugefügt
- Feature-Übersicht auf der Landing Page
- Call-to-Action Buttons für Anmeldung und Registrierung

### Behoben
- Verbesserte Benutzerführung durch klare Handlungsaufforderungen

## [2.8.0]

### Geändert
- Einnahmenberechnung basiert jetzt auf dem konfigurierten Gehaltsmonat
- Verbesserte Sortierung der wiederkehrenden Zahlungen nach nächstem Zahlungsdatum
- Anzeige der Version in der Navigation mit Link zum Changelog
- Aktualisierte Lizenz auf GPL-3.0

### Hinzugefügt
- Filterung der wiederkehrenden Zahlungen auf die nächsten 30 Tage
- Kumulierte Anzeige der Ausgaben pro Kategorie im Dashboard

### Behoben
- Korrektur der Einnahmenberechnung im Dashboard
- Verbesserte Darstellung der Kategorieverteilung im Pie-Chart

## [2.7.2]

### Geändert
- CSS entschlackt und geändert

## [2.7.1]

### Hinzugefügt
- Tastaturnavigation
- API Doku

## [2.7.0]

### Geändert
- Überarbeitetes Dashboard-Layout
- Verbesserte Navigation mit kollabierbarer Sidebar
- Optimierte mobile Ansicht

### Hinzugefügt
- Neue Kategorie- und Händlerverwaltung
- Erweiterte Einstellungsseite
- Verbesserte Transaktionsübersicht

### Behoben
- Korrektur der Datumsberechnung für wiederkehrenden Zahlungen
- Verbesserte Fehlerbehandlung bei der API

## [2.6.0]

### Geändert
- Aktualisierte Benutzeroberfläche
- Verbesserte Performance
- Optimierte Datenbankabfragen

### Hinzugefügt
- Neue Filteroptionen für Transaktionen
- Erweiterte Exportfunktionen
- Verbesserte Fehlerbehandlung
- Recurring-Funktion für Buchungen wiederhergestellt

### Behoben
- Korrektur der Datumsanzeige
- Behebung von Layoutproblemen auf mobilen Geräten

## [2.5.4]

### Verbessert
- Optimierte Implementierung des Infinite Scrollings für bessere Performance und Zuverlässigkeit
- Verbesserte Ladeanimation und Benutzerführung beim Nachladen von Transaktionen

## [2.5.3]

### Geändert
- Verbesserte Farbkodierung für wiederkehrende Zahlungen
  - Monatlich: Grün
  - Vierteljährlich: Gelb
  - Jährlich: Indigo
  - Gesamt pro Monat: Violett

## [2.5.2]

### Verbessert
- Versionsnummer in der Navigation ist jetzt mit der CHANGELOG.md verlinkt
- Verbesserte Benutzerführung durch klickbare Versionsnummer
- Optimierte Navigation für bessere Benutzerinteraktion
- Responsives Design der Transaktionsliste für mobile Geräte
- Verbesserte mobile Ansicht mit optimierter Darstellung der Transaktionsdetails
- Angepasste Breakpoints für bessere Darstellung auf verschiedenen Bildschirmgrößen

## [2.5.1]

### Sicherheit
- Kritische Sicherheitsverbesserung: Anmeldedaten werden nicht mehr über URL-Parameter übertragen
- Implementierung zusätzlicher Sicherheitschecks im Authentifizierungsprozess
- Nur POST-Anfragen für Anmeldungen erlaubt
- Verbesserte Fehlerbehandlung
- Designänderungen

## [2.5.0]

### Geändert
- Überarbeitetes Design
- Verbesserte Benutzerführung
- Optimierte Datenbankstruktur

### Hinzugefügt
- Neue Visualisierungen im Dashboard
- Erweiterte Kategoriefunktionen
- Verbesserte Händlerverwaltung

### Behoben
- Korrektur der Berechnungslogik
- Behebung von Anzeigefehlern

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
- Neue Filteroptionen
- Erweiterte Exportfunktionen
- Verbesserte Fehlerbehandlung

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
- Neue Visualisierungen
- Erweiterte Kategoriefunktionen
- Verbesserte Händlerverwaltung

### Verbessert
- Optimiertes Handling von Transaktionsänderungen
- Verbesserte Darstellung von Kategorien in der Transaktionsliste
- Bessere Fehlerbehandlung bei API-Aufrufen
- Überarbeitetes Design
- Verbesserte Benutzerführung
- Optimierte Datenbankstruktur

### Behoben
- Problem mit nicht aktualisierten Summen nach Transaktionsänderungen
- Fehler bei der Anzeige von Kategoriefarben
- Korrektur der Berechnungslogik
- Behebung von Anzeigefehlern

## [2.2.1]

### Verbessert
- Optimierte Darstellung der Händlerverwaltung
- Verbesserte Navigation auf mobilen Geräten

### Behoben
- Fehler bei der Verknüpfung von Transaktionen mit Händlern
- Problem mit der Anzeige von wiederkehrenden Zahlungen

## [2.2.0]

### Hinzugefügt
- Kategorieverwaltung für Händler
- Farbliche Kennzeichnung von Kategorien
- Verbessertes Handling von wiederkehrenden Zahlungen
- Neue Filteroptionen
- Erweiterte Exportfunktionen
- Verbesserte Fehlerbehandlung

### Verbessert
- Überarbeitetes UI/UX-Design
- Optimierte Ladezeiten
- Aktualisierte Benutzeroberfläche
- Verbesserte Navigation
- Optimierte Datenbankabfragen

### Behoben
- Verschiedene kleinere Bugfixes
- Korrektur der Datumsanzeige
- Behebung von Layoutproblemen

## [2.1.0]

### Hinzugefügt
- Händlerverwaltung
- Automatische Erstellung ausstehender Zahlungen
- Bestätigungssystem für Transaktionen
- Neue Visualisierungen
- Erweiterte Kategoriefunktionen
- Verbesserte Händlerverwaltung

### Verbessert
- Performance-Optimierungen
- Bessere mobile Ansicht
- Überarbeitetes Design
- Verbesserte Benutzerführung
- Optimierte Datenbankstruktur

### Behoben
- Korrektur der Berechnungslogik
- Behebung von Anzeigefehlern

## [2.0.0]

### Hinzugefügt
- Komplette Neuimplementierung mit Next.js 14
- Neue Benutzeroberfläche mit TailwindCSS
- Verbesserte Authentifizierung mit NextAuth.js
- Prisma als ORM für bessere Datenbankintegration
- Neue Dashboard-Funktionen
- Erweiterte Transaktionsverwaltung
- Verbesserte Kategorisierung
- Neue Händlerverwaltung

### Geändert
- Migration von Express.js zu Next.js
- Überarbeitete Datenbankstruktur
- Moderneres UI/UX-Design
- Komplett überarbeitete Benutzeroberfläche
- Neue Architektur basierend auf Next.js 14
- Verbesserte Datenbankstruktur

### Entfernt
- Alte Frontend-Komponenten
- Veraltete API-Endpunkte
- Nicht mehr benötigte Abhängigkeiten

### Behoben
- Alle bekannten Fehler der Vorgängerversion
- Verbesserte Performance
- Optimierte Datenbankabfragen

## [1.4.0]

### Hinzugefügt
- Moderne Modal-Dialoge für Transaktionsbearbeitung
- Verbesserte Benutzerinteraktion durch In-Page-Bearbeitung
- Optimierte Darstellung der Bearbeitungsformulare

### Verbessert
- Überarbeitete Benutzeroberfläche für Transaktionsbearbeitung
- Effizienterer Workflow durch Modal-Dialoge
- Reduzierte Seitenneuladezeiten durch In-Page-Updates

## [1.3.2]

### Verbessert
- Optimiertes Design der Kontobezeichnung auf der Transaktionsseite

## [1.3.1]

### Verbessert
- Kompakteres Design der Monatsübersicht
- Optimierte Darstellung der Beträge neben den Beschriftungen
- Verbesserte Platznutzung in der Benutzeroberfläche

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

### Hinzugefügt
- Erste Version der Anwendung
- Grundlegende Funktionen für die Finanzverwaltung
- Basis-Dashboard
- Transaktionsverwaltung
- Kategorisierung
- Benutzerauthentifizierung
- Erfassung von Einnahmen und Ausgaben
- Monatliche Übersicht
- Benutzerverwaltung mit Kontoeinstellungen
