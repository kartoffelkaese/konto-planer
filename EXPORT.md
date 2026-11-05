# Datenexport nach DSGVO

Nutzer laden unter **Einstellungen → Dein Benutzerkonto → „Meine Daten herunterladen“** alle Daten, die KontoPlaner über sie speichert, als ZIP-Datei herunter. Der Export dient der Auskunft (Art. 15 DSGVO) und der Datenübertragbarkeit (Art. 20).

Er ersetzt nicht das **Backup**. Das Backup sichert ein einzelnes Konto und lässt sich wieder einspielen; der Export umfasst alle Daten des Nutzers und lässt sich nicht einspielen.

## Ablauf

1. Der Nutzer klickt auf „Daten herunterladen“ und bestätigt mit seinem Passwort.
2. `POST /api/users/export` mit `{ "password" }` prüft Sitzung, Begrenzung und Passwort.
3. Der Server sammelt die Daten, baut die ZIP-Datei im Speicher und liefert sie direkt aus. Gespeichert wird nichts.
4. Ins Server-Protokoll kommt nur der Vermerk „Datenexport erstellt“ mit der Nutzer-ID, keine Inhalte.

| Antwort | Bedeutung |
|---------|-----------|
| `200` | ZIP-Datei (`application/zip`, `Cache-Control: no-store`) |
| `400` | Passwort fehlt oder ist falsch |
| `401` | nicht angemeldet |
| `429` | mehr als 5 Versuche in einer Stunde (je Nutzer und IP) |

## Inhalt der ZIP-Datei

| Datei | Inhalt |
|-------|--------|
| `Uebersicht.html` | Alles lesbar auf einer Seite, im Browser zu öffnen und zu drucken; am Ende „Angaben zur Verarbeitung“ und „Nicht enthalten“ |
| `daten.json` | Dieselben Daten für andere Programme (Daten im ISO-Format, Beträge als Zahl) |
| `csv/benutzer.csv` | Benutzerdaten, Level und Abo |
| `csv/level-verlauf.csv` | Level-Änderungen |
| `csv/konto-<name>-buchungen.csv` | Buchungen und Vorlagen je eigenem Konto |
| `csv/konto-<name>-kategorien.csv`, `…-haendler.csv` | Kategorien und Händler je eigenem Konto |
| `csv/geteilte-konten.csv` | Mitgliedschaften in fremden Konten |
| `csv/split-listen.csv`, `split-ausgaben.csv`, `split-ausgleiche.csv` | Split-Listen und die eigene Beteiligung |
| `csv/einladungen.csv` | Verschickte und offene erhaltene Einladungen |

Die CSV-Dateien sind für ein deutsches Excel eingerichtet:
- Semikolon als Trenner, UTF-8 mit BOM
- Dezimalkomma, Datumsangaben als `TT.MM.JJJJ`
- Texte, die mit `=`, `+`, `-` oder `@` beginnen, bekommen ein `'` davor. So führt Excel sie nicht als Formel aus.

## Was enthalten ist und was nicht

Die Regeln sitzen an einer Stelle: [`src/lib/dataExport/collect.ts`](src/lib/dataExport/collect.ts).

| Bereich | Im Export |
|---------|-----------|
| Benutzer | E-Mail, Registrierung, Bestätigung, ausstehende neue E-Mail, Split-Anzeigename, letzte Anmeldung, Admin-Recht, beschreibbares Konto |
| Level und Abo | geltendes und gespeichertes Level, Quelle, Ablauf, Abo-Status (deutsch), Abrechnung, Kündigung, „Kunde bei Stripe: ja/nein“ |
| Level-Verlauf | alle Änderungen. „Geändert von“ lautet „du selbst“, „Verwaltung“ oder „automatisch“, nie die E-Mail eines Admins |
| Eigene Konten (Rolle Inhaber) | Stammdaten, Anzahl weiterer Mitglieder, Kategorien, Händler, alle Buchungen und Vorlagen |
| Geteilte Konten (Mitglied, nur Lesen) | nur Kontoname, Rolle und „Mitglied seit“, **keine Buchungen**. Buchungen speichern nicht, wer sie angelegt hat; sie gehören zum Konto des Inhabers |
| Split-Listen | Liste, Rolle, Status, eigener Teilnehmername. Ausgaben nur, wenn der Nutzer gezahlt hat oder beteiligt ist, mit seinem Anteil. Ausgleiche nur von oder an ihn. Andere erscheinen als „andere Person“ |
| Einladungen | Datum, Konto oder Liste, Rolle, Status, **ohne E-Mail-Adresse** der anderen Person |

**Nicht enthalten:**
- Passwort-Hash, Sitzungsversion, Bestätigungs-Tokens, Hash des Lese-Links
- Interne IDs und Stripe-IDs
- Namen und E-Mail-Adressen anderer Personen

Zahlungsdaten liegen bei Stripe; die Übersicht verweist auf das Kundenportal.

Der Anteil an einer Split-Ausgabe wird wie bei den Salden berechnet: gleich aufgeteilt, den Rundungsrest trägt der letzte Anteil (`splitAmountEqually` in [`src/lib/splitBalances.ts`](src/lib/splitBalances.ts)).

## Fallstricke

### Der Text „Angaben zur Verarbeitung“ in `render.ts`

Der Abschnitt steht als fester Text in `renderHtml` in [`src/lib/dataExport/render.ts`](src/lib/dataExport/render.ts) und ist ein **Entwurf**. Vor dem Live-Gang und nach jeder Änderung der Datenschutzerklärung prüfen:

- **Fest eingetragene Dienstleister:** Genannt sind netcup (Hosting), „ein E-Mail-Dienst“ und Stripe. Wer KontoPlaner anders betreibt (GPL, eigene Installation), muss den Text anpassen. Er stammt nicht aus `content/legal/datenschutz.md`.
- **Stripe wird immer genannt,** auch wenn keine Abos angeboten werden (`PLANS_ENABLED` oder Stripe nicht eingerichtet).
- **Kein Abgleich mit der Datenschutzerklärung:** Ändert sich `datenschutz.md`, bleibt der Exporttext gleich. Beide Stellen müssen dasselbe sagen.
- **Nicht vollständig:**
  - Es fehlen Verantwortlicher und Kontakt.
  - Rechtsgrundlagen fehlen.
  - Die Speicherdauer von Server-Protokollen, Sicherungen beim Hoster und Aufbewahrungspflichten (z. B. Rechnungen bei Stripe) fehlt.
  - Der Abschnitt verweist dafür auf die Datenschutzerklärung. Den Link gibt es nur, wenn `content/legal/datenschutz.md` beim Build vorhanden war (`AVAILABLE_LEGAL_PAGES`); die Adresse kommt aus `AUTH_URL`.
- **Keine Rechtsberatung:** Den Text sollte jemand mit Kenntnis der DSGVO freigeben.
- **Änderungen brauchen einen neuen Build:** Der Text ist Code, keine Datei unter `content/`.

### Freitexte

Beschreibungen, Händlernamen, Kontonamen, Notizen zu Ausgleichen und Namen von Split-Listen kommen so in den Export, wie sie eingegeben wurden. Steht dort ein Name („Geschenk für Anna“, „Haushalt von Ben“), ist er enthalten. Freitext lässt sich nicht zuverlässig filtern. Der Filter gilt nur für die Felder, die Personen bezeichnen (Teilnehmer, Mitglieder, Einladungen, Admin).

In geteilten Split-Listen stammen Beschreibungen oft von anderen Personen. Sie stehen trotzdem im Export, wenn der Nutzer an der Ausgabe beteiligt ist.

### Sonstiges

- **Begrenzung nur im Speicher:** Die 5 Versuche pro Stunde zählt `src/lib/rate-limit.ts` im Arbeitsspeicher des Prozesses. Nach einem Neustart oder bei mehreren PM2-Instanzen gilt die Grenze je Prozess.
- **Große Konten:** Die ZIP-Datei entsteht im Speicher und in einem Schritt. Bei sehr vielen Buchungen (zehntausende) dauert das länger und braucht entsprechend Speicher. Bisher: unter 1 Sekunde für einen Nutzer mit wenigen Daten.
- **Unverschlüsselt:** Die ZIP-Datei hat kein Passwort. Die Karte weist darauf hin, sie sicher aufzubewahren.
- **iPhone als installierte App:** Downloads öffnen dort teils die Teilen-Ansicht statt eines Ordners. Das ist noch nicht auf einem Gerät geprüft.
- **Format ändern:** `version` in `daten.json` (`DATA_EXPORT_VERSION` in `collect.ts`) erhöhen, wenn sich Felder ändern, und die Tests in [`src/test/routes/dataExport.test.ts`](src/test/routes/dataExport.test.ts) anpassen.

## Dateien

| Datei | Aufgabe |
|-------|---------|
| [`src/lib/dataExport/collect.ts`](src/lib/dataExport/collect.ts) | Daten sammeln, alle Datenschutz-Filter |
| [`src/lib/dataExport/render.ts`](src/lib/dataExport/render.ts) | HTML, CSV, ZIP; Text „Angaben zur Verarbeitung“ und Liste „Nicht enthalten“ (`OMITTED_DATA`) |
| [`src/app/api/users/export/route.ts`](src/app/api/users/export/route.ts) | Route mit Passwort und Begrenzung |
| [`src/components/settings/DataExportCard.tsx`](src/components/settings/DataExportCard.tsx) | Karte und Dialog in den Einstellungen |
| [`src/test/routes/dataExport.test.ts`](src/test/routes/dataExport.test.ts) | Tests für Filter, Ausgabe und Route |
