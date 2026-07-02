# CSV-Import-Formate

Pro **Export-Layout** ein Modul unter `formats/`. Banken werden in [`bankFormats.ts`](../bankFormats.ts) zugeordnet (n:1).

## Bestehende Formate

| formatId | Label | Bank(en) |
|----------|-------|----------|
| `dkbExport` | DKB Kontoumsätze | `dkb` |
| `ingExport` | ING Kontoumsätze | `ing` |

## Neues Format hinzufügen

1. **Sample-CSV** anonymisieren und als Test-Fixture ablegen.
2. **Modul** `formats/<formatId>.ts` mit `detect`, `parseRow`, optional `headerMarkers`, `parseMetadata`, `skipRow`.
3. **`types.ts`:** `CsvImportFormatId` erweitern.
4. **`index.ts`:** Modul in `FORMATS`-Array registrieren.
5. **`bankFormats.ts`:** `bankId → formatId` eintragen (mehrere Banken dürfen dasselbe Format nutzen).
6. **Tests** unter `src/lib/csvImport/<formatId>.test.ts`.
7. **`API.md`:** Spalten dokumentieren.

## Internes Zielmodell (`ParsedCsvRow`)

Jedes Format mappt auf:

- `date`, `amount` (Ausgaben negativ)
- `merchantRaw`, `description`
- `isConfirmed` (nur bei gebuchten CSV-Zeilen `true`)
- `errors[]`

Preview, Duplikat-Erkennung, Wiederkehrend und Commit arbeiten nur mit diesem Modell. Wiederkehrende Vorlagen werden über `recurringInterval` gematcht (u. a. `monthly`, `quarterly`, `semiannual`, `yearly`); das Intervall wird beim Backup-Import unverändert übernommen.

## Checkliste

- [ ] Signed `amount` korrekt
- [ ] `isConfirmed: false` bei vorgemerkten Zeilen
- [ ] `headerMarkers` für Kopfzeilen-Suche gesetzt
- [ ] Bank ohne Mapping **nicht** auf DKB-Fallback leiten
- [ ] `detect()` für Header-Validierung (Warnung `headerMismatch`)
