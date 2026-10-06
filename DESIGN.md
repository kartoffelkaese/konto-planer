# Design-Grundlagen

Verbindliche Gestaltungsregeln für Konto-Planer. Stil: **„Soft & ruhig“** – weiche Flächen statt Rahmen, große Radien, sanfte Schatten, viel Weißraum, große Zahlen. Ein Design in Hell und Dunkel.

Jede neue oder geänderte Oberfläche richtet sich nach diesem Dokument. Wer davon abweichen muss, ändert zuerst die Regel hier (und die Stelle im Code, die sie umsetzt) – nicht nur die eine Seite.

**Wo die Werte leben**

| Was | Datei |
|-----|-------|
| Farben, Radien, Schatten, Bewegung, CSS-Klassen | [`src/app/globals.css`](src/app/globals.css) |
| Tailwind-Namen der Tokens | [`tailwind.config.mjs`](tailwind.config.mjs) |
| Farbwerte für den Kontrasttest (gespiegelt) | [`src/lib/colorSchemeTokens.ts`](src/lib/colorSchemeTokens.ts) |
| Hell/Dunkel/System | [`src/lib/colorSchemes.ts`](src/lib/colorSchemes.ts) |

## 1. Grundsätze

1. **Tokens statt Werte.** Keine Hex-Farben, keine freien Schatten oder Radien in Komponenten. Immer die Tailwind-Namen (`bg-surface`, `text-secondary`, `rounded-card` …) oder die CSS-Variablen.
2. **Vorhandenes zuerst.** Für Buttons, Tabs, Karten, Dialoge, Meldungen gibt es je genau eine Komponente (Abschnitt 6). Keine zweite Variante daneben bauen.
3. **Fläche statt Rahmen.** Gruppierung entsteht durch Karten auf dem Hintergrund, nicht durch Linien. Rahmen nur an Eingabefeldern; Trennlinien nur in `hairline`.
4. **Eine Hauptaktion pro Ansicht.** Genau ein gefüllter Akzent-Button; alles andere ist `secondary` oder `ghost`.
5. **Farbe trägt Bedeutung.** Grün = Einnahme, Rot = Ausgabe, Gelb = ausstehend, Akzent = interaktiv/aktiv. Nie rein dekorativ einsetzen, nie als einziges Unterscheidungsmerkmal (immer zusätzlich Vorzeichen, Icon oder Text).
6. **Mobil ist gleichwertig.** Jede Ansicht muss bei 375 px Breite ohne horizontales Scrollen bedienbar sein.
7. **Ruhe.** Bewegung erklärt einen Zustandswechsel und ist kurz. Nichts blinkt, springt oder animiert ohne Anlass.

## 2. Farben

Hell in `:root`, Dunkel in `html.dark`. Verwendet werden ausschließlich die Tailwind-Namen.

| Tailwind | Zweck | Hell | Dunkel |
|----------|-------|------|--------|
| `canvas` | Seitenhintergrund | `#f5f6f8` | `#0b0d12` |
| `surface` | Karten | `#ffffff` | `#151821` |
| `surface-muted` | eingelassene Flächen, Hover, Leisten | `#eef0f4` | `#1e222d` |
| `surface-raised` | Dialog, Sheet, Popover | `#ffffff` | `#1b1f2a` |
| `border` | Rahmen von Eingabefeldern (≥ 3:1) | `#7e8396` | `#6f7689` |
| `hairline` | Trennlinien, feine Kanten | `#e6e8ee` | `#262b37` |
| `primary` | Haupttext | `#12141a` | `#eef0f5` |
| `secondary` | Nebentext, Beschriftungen | `#5b6070` | `#9aa1b2` |
| `accent` / `accent-hover` | Hauptaktion, aktive Elemente, Links | `#4f46e5` / `#4338ca` | `#8b87ff` / `#a5a2ff` |
| `accent-subtle` | Hintergrund aktiver Einträge, Fokus-Ring | `#eef0ff` | `#1f2040` |
| `accent-foreground` | Text auf Akzent | `#ffffff` | `#0b0d12` |
| `income` / `income-bg` | Einnahmen | `#0f7a52` / `#e3f5ec` | `#4ade9a` / `#0f2a1f` |
| `expense` / `expense-bg` | Ausgaben | `#c2362f` / `#fdecea` | `#ff7a72` / `#321514` |
| `pending` / `pending-bg` | ausstehend, Warnung | `#8a5c00` / `#fdf3d6` | `#f5c451` / `#2e2510` |
| `danger` / `danger-subtle` | Löschen, Fehler | `#b42318` / `#fee4e2` | `#ff6b61` / `#3a1614` |

Regeln:

- **Kontrast:** Text mindestens 4,5:1, Bedienelemente und Grafiken mindestens 3:1 (WCAG AA). Wer einen Farbwert ändert, ändert ihn in `globals.css` **und** `colorSchemeTokens.ts`; `colorContrast.test.ts` prüft beide Modi.
- **Beträge:** Einnahmen `text-income`, Ausgaben `text-expense`, jeweils mit Vorzeichen. Beträge ohne Richtung (Summen, Kontostand, absolute Werte) bleiben `text-primary`.
- **`expense` ≠ `danger`:** `expense` ist eine Geldrichtung, `danger` eine zerstörende Aktion oder ein Fehler.
- **Kategorie- und Händlerfarben** kommen vom Nutzer; Text darauf über `colorContrast.ts` wählen.
- Jede Änderung in **Hell und Dunkel** ansehen.

## 3. Typografie

Schrift: Inter. Zahlen in Beträgen und Tabellen immer mit Tabellenziffern.

| Klasse | Einsatz | Größe |
|--------|---------|-------|
| `page-title` | eine `h1` pro Seite | 28 px, Gewicht 650 |
| `text-lg font-semibold` | Karten-Überschrift | 18 px |
| `text-sm` | Fließtext, Listen, Formulare | 14 px |
| `eyebrow` | Beschriftung über Wert oder Feld | 12 px, `secondary` |
| `text-xs text-secondary` | Hinweise, Metadaten | 12 px |
| `amount-hero` | die eine zentrale Zahl einer Seite | 36–52 px |
| `amount-lg` | Kennzahlen in Karten | 24 px |
| `amount` | Beträge in Listen | Gewicht 600, Tabellenziffern |

- Keine Beschriftungen in Großbuchstaben; dafür `eyebrow`.
- Eingabefelder haben mobil mindestens 16 px Schrift (sonst zoomt iOS) – das regelt `globals.css`, nicht überschreiben.

## 4. Form, Fläche, Abstand

| Token | Wert | Einsatz |
|-------|------|---------|
| `rounded-card` | 20 px | Karten, Meldungen |
| `rounded-control` | 12 px | Buttons, Eingabefelder, Listeneinträge |
| `rounded-pill` | voll | Tab-Leisten, Chips, Zähler |
| `shadow-card` | sanft | Karten |
| `shadow-raised` | deutlich | Dialog, Sheet, Meldung |

- **Karte:** Klasse `card` plus Innenabstand `p-4 md:p-5` (dichte Inhalte) oder `p-5 md:p-6`. Im Dunkelmodus ersetzt eine feine Kante den Schatten – das macht `card` selbst. Nicht `bg-surface border rounded-lg` von Hand zusammensetzen.
- **Hervorgehobene Karte:** `hero-card`, höchstens eine pro Seite.
- **Seitenrahmen:** `max-w-6xl mx-auto px-4 py-6 sm:px-6 md:py-8`. Seiten mit breiten Tabellen (Buchungen, Wiederkehrend) nutzen `max-w-7xl`.
- **Abstände:** zwischen Karten `gap-4 md:gap-6`, innerhalb einer Karte `space-y-4`, zwischen Kopf-Buttons `gap-2`.
- **Listen:** Zeilen ohne Rahmen, Hover in `surface-muted`, Trennung höchstens per `divide-hairline`.

## 5. Bewegung

| Token | Wert | Einsatz |
|-------|------|---------|
| `duration-feedback` | 150 ms | Hover, Farbe, Drücken |
| `duration-expand` | 220 ms | Auf-/Zuklappen, Ein-/Ausblenden |
| `--motion-easing` | `cubic-bezier(.2,.8,.2,1)` | Standardkurve |
| `--sidebar-duration` / `--sidebar-easing` | 240 ms | Seitenleiste **und** Seiteninhalt |

- **Was sich gemeinsam bewegt, bewegt sich synchron** – gleiche Dauer, gleiche Kurve (Beispiel: Leiste und Inhalt).
- **Elemente behalten ihren Platz.** Beim Wechsel zwischen zwei Zuständen springen Icons nicht; Text blendet ein oder aus, statt das Layout umzubauen.
- **Micro-Interactions** bestätigen eine Eingabe: gleitende Markierung in Tab-Leisten, Icon-Wechsel durch Drehen/Überblenden, kurzes Nachgeben beim Drücken, versetztes Einblenden von Listeneinträgen in einem Sheet (40 ms Versatz). Ein leichtes Überschwingen ist erlaubt, Dauer höchstens ~350 ms.
- **Tooltips** erscheinen erst nach kurzem Verweilen (350 ms).
- **`prefers-reduced-motion`** wird respektiert (globale Regel). Neue `@keyframes` mit Verzögerung brauchen dort eine eigene Ausnahme, damit nichts unsichtbar wartet.
- Nur `transform` und `opacity` animieren, wo möglich.

## 6. Bausteine

### Buttons – [`Button`](src/components/Button.tsx)

Für Links im Button-Look `getButtonClassName()`.

| Variante | Einsatz |
|----------|---------|
| `primary` | die eine Hauptaktion der Ansicht |
| `secondary` | weitere Aktionen |
| `ghost` | beiläufige Aktionen (Zurücksetzen, Rückgängig, Abbrechen) |
| `danger` | zerstörende Aktion bestätigen |
| `danger-outline` | zerstörende Aktion anbieten |
| `accent-subtle`, `warning` | Sonderfälle, sparsam |

| Größe | Maße | Einsatz |
|-------|------|---------|
| `md` (Standard) | 44 px hoch, 14 px Schrift, Icon `h-5 w-5` | **Seitenkopf**, Formulare, Dialoge |
| `sm` | 36 px (mobil 44 px), 12 px Schrift, Icon `h-4 w-4` | nur innerhalb von Karten, Listen, Tabellenzeilen |
| `lg` | 48 px | Landing-Page |

- **Referenz ist die Übersicht:** Im Seitenkopf stehen immer `md`-Buttons; die Hauptaktion rechts, mit Icon vor dem Text (`PlusIcon` für „Neu …“).
- Icons aus `@heroicons/react/24/outline`, mit `aria-hidden`.
- Laufende Aktion über `loading` und `loadingText` („Wird gespeichert…“), nicht über eigenen Spinner.
- Beschriftung: Verb oder „Neue …“, kurz, ohne Punkt.
- Mobil kann die Hauptaktion zusätzlich als runder Schwebe-Button über der Tab-Leiste erscheinen (siehe Buchungen).

### Tab-Gruppen – [`SegmentedControl`](src/components/SegmentedControl.tsx)

Die einzige Form für „eins aus wenigen“: Zeitraum-Filter, Darstellung, Bereiche einer Seite.

- Leiste in `surface-muted` mit `rounded-pill`, die gewählte Option liegt auf einer hellen Markierung, die beim Wechsel gleitet.
- `role="radiogroup"` für Filter/Werte, `role="tablist"` für Bereiche.
- Bis drei Optionen: gleich breite Spalten (`grid grid-cols-3`). Mehr Optionen: `flex min-w-min` in einem seitlich scrollbaren Container.
- Lange Beschriftungen bekommen ein `shortLabel` für schmale Displays.
- Keine gefüllten Akzent-Pillen und keine Einzel-Buttons als Tab-Ersatz.

Mehrfachauswahl oder Auswahl mit Erklärtext (z. B. Split-Formular) ist kein Tab – dort bleiben Auswahlkacheln.

### Seitenkopf – [`PageContextHeader`](src/components/PageContextHeader.tsx)

Titel (`page-title`), eine Kontextzeile in `secondary`, Aktionen rechts. Jede Seite nutzt ihn.

### Formulare

- Eingabefelder erben ihr Aussehen global (44 px hoch, `rounded-control`, Rahmen `border`, Fokus mit Akzent-Kante und Ring). Keine eigenen Rahmen- oder Fokusstile.
- Jedes Feld hat ein sichtbares Label oder ein `sr-only`-Label; Platzhalter sind nie die einzige Beschriftung.
- Fehler stehen am Feld und in `danger`, nicht nur als Meldung.

### Dialoge und Sheets

- [`Modal`](src/components/Modal.tsx) für Formulare und Auswahl, [`ConfirmDialog`](src/components/ConfirmDialog.tsx) für Ja/Nein. Mobil erscheinen sie als Sheet von unten.
- Zerstörende Aktionen immer mit Bestätigung; der Bestätigen-Button ist `danger`.
- Mehr als zwei Wahlmöglichkeiten: Buttons untereinander, sicherste Option zuerst, „Abbrechen“ zuletzt als `ghost`.

### Meldungen – `useToast()`

- Erfolg 3 s, Warnung 4 s, Fehler 5,5 s; mit Aktion (z. B. „Rückgängig“) 8 s.
- Text nennt das Ergebnis konkret („5 ausstehende Zahlungen erstellt“), nicht nur „Erfolgreich“.
- Höchstens eine Aktion pro Meldung.

### Weitere

| Baustein | Einsatz |
|----------|---------|
| [`KpiCard`](src/components/KpiCard.tsx) | Kennzahl mit `eyebrow`, Icon-Badge und `amount-lg` |
| `chip` | kleine Zusatzinformation (Wert mit Beschriftung) |
| [`EmptyState`](src/components/EmptyState.tsx) | leere Listen: was fehlt und die nächste Aktion |
| [`PageLoader`](src/components/PageLoader.tsx), [`PageError`](src/components/PageError.tsx) | Laden und Fehler ganzer Seiten |
| [`AccountAvatar`](src/components/AccountAvatar.tsx) | Konto/Bank-Logo |

## 7. Navigation

- **Desktop (ab 768 px):** feste Seitenleiste, 240 px mit Beschriftung oder 72 px nur mit Icons; Zustand wird gespeichert. Aktiver Eintrag als Fläche in `accent-subtle`. Eingeklappt zeigen Tooltips die Namen.
- **Mobil:** Tab-Leiste unten mit vier Einträgen; „Mehr“ öffnet ein Sheet mit allem, was nicht in der Leiste steht. Keine doppelten Einträge.
- Inhalte halten mobil Abstand zur Tab-Leiste über `--mobile-tabbar-space`; schwebende Elemente ebenfalls.
- Bereichsnamen sind überall gleich: **Übersicht, Buchungen, Wiederkehrend, Statistiken, Split, Einstellungen.** Admins sehen zusätzlich **Verwaltung**.

## 8. Responsiv

- Umbruch der Navigation bei `md` (768 px). Layouts werden mobil zuerst gebaut.
- Tippflächen mindestens 44 × 44 px.
- Etwas nur ab `md` zeigen: `max-md:hidden` – **nicht** `hidden md:inline-flex` (wirkt bei Buttons nicht, weil deren Grundklasse `inline-flex` setzt).
- Tabellen werden mobil zu Karten oder Listen; kein horizontales Scrollen der Seite. Seitlich scrollen dürfen nur Tab-Leisten und Diagramme.
- Geprüft wird bei 375 px und bei Desktop-Breite.

## 9. Zugänglichkeit

- Fokus ist immer sichtbar (globaler Ring in `accent`); nie `outline: none` ohne Ersatz.
- Icon-Buttons haben ein `aria-label`; dekorative Icons `aria-hidden`.
- Zustände stehen im Markup (`aria-current`, `aria-expanded`, `aria-checked`/`aria-selected`), nicht nur in der Farbe.
- Dialoge und Sheets schließen mit Escape und sperren das Scrollen dahinter.

## 10. Sprache

- Deutsch, **Du-Form** („Bitte wähle …“, „Möchtest du …?“), sachlich und knapp. „du“ und „dein“ klein geschrieben. Gilt auch für Server-Fehlermeldungen und E-Mails.
- Typografische Zeichen: „Anführungszeichen“, Auslassung „…“, Gedankenstrich „–“, Trenner „·“.
- Beträge und Daten über `formatCurrency` und `formatDate` (1.234,56 € · 01.10.2026).
- Ein Begriff pro Sache – im Zweifel den aus der Navigation verwenden.

## 11. Technische Leitplanken (Tailwind 4)

- Grundregeln für HTML-Elemente gehören in `@layer base`, wiederverwendbare Klassen in `@layer components`. CSS außerhalb eines Layers schlägt jede Tailwind-Utility.
- Varianten wie `max-md:` oder `hover:` wirken nur auf Tailwind-Utilities, nicht auf eigene CSS-Klassen.
- Eigene Klassen nur, wenn Utilities nicht reichen (Animationen, Pseudo-Elemente, Zustände über `data-*`); benannt nach dem Baustein (`segmented-indicator`, `mobile-sheet-item`).
- Zustandsabhängige Animationen über `data-*`-Attribute steuern, nicht über wechselnde Klassenlisten.

## 12. Checkliste vor dem Abschluss

- [ ] Nur Tokens, keine festen Farben, Radien oder Schatten
- [ ] Vorhandene Bausteine verwendet (Button, SegmentedControl, card, Modal, Toast)
- [ ] Seitenkopf-Buttons in `md`, genau eine `primary`-Aktion
- [ ] Hell und Dunkel angesehen
- [ ] 375 px und Desktop angesehen, kein horizontales Scrollen
- [ ] Tastatur: Fokus sichtbar, Escape schließt
- [ ] Zustandswechsel animiert, synchron, ohne Sprünge; ruhig bei „Bewegung reduzieren“
- [ ] Texte in Du-Form, Begriffe wie in der Navigation
- [ ] `npm run typecheck`, `npm run lint`, `npm test`
