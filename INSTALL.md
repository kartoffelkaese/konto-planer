# Installation (Server)

Anleitung zum Betrieb von Konto-Planer auf einem Linux-Server (z. B. VPS mit nginx/Caddy davor).

## Voraussetzungen

- **Node.js 22.12+** und npm, empfohlen Node 24 wie im CI (Vitest braucht mindestens 22.12, Prisma 7 mindestens 20.19)
- **MySQL 8** oder **MariaDB 10.6+** (eigene Datenbank und Benutzer)
- Optional: **PM2** für Prozessverwaltung (`npm install -g pm2`)
- Reverse-Proxy mit HTTPS (empfohlen)

## 1. Code bereitstellen

```bash
git clone https://github.com/kartoffelkaese/konto-planer.git
cd konto-planer
npm install
```

`postinstall` führt automatisch `prisma generate` aus.

**Wichtig:** Es darf kein Ordner `prisma/node_modules/` existieren — das wäre ein veralteter, eingecheckter Prisma-Client und führt zu Typecheck-Fehlern (`splitListCurrency`).

## 2. Umgebungsvariablen

Datei `.env` im Projektroot anlegen:

```env
DATABASE_URL="mysql://BENUTZER:PASSWORT@localhost:3306/konto_planer"
AUTH_SECRET="…"          # z. B.: openssl rand -base64 32
AUTH_URL="https://ihre-domain.de"
NODE_ENV=production
```

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `DATABASE_URL` | ja | MySQL/MariaDB-URL (`mysql://user:pass@host:3306/dbname`) |
| `AUTH_SECRET` | ja | Geheimer Schlüssel für Sessions (alternativ `NEXTAUTH_SECRET`) |
| `AUTH_URL` | ja (Prod.) | Öffentliche Basis-URL **mit** Schema, ohne Slash am Ende (alternativ `NEXTAUTH_URL`) |
| `NODE_ENV` | empfohlen | `production` |
| `TRUST_PROXY` | ja (Prod.) | `true` hinter Reverse-Proxy |
| `SMTP_HOST` | ja (Prod.) | SMTP-Server für E-Mail-Bestätigung |
| `SMTP_PORT` | ja (Prod.) | z. B. `587` oder `465` |
| `SMTP_USER` | ja (Prod.) | SMTP-Benutzername |
| `SMTP_PASS` | ja (Prod.) | SMTP-Passwort |
| `SMTP_FROM` | ja (Prod.) | Absender, z. B. `KontoPlaner <noreply@ihre-domain.de>` |
| `SMTP_SECURE` | optional | `true` für Port 465 |
| `PLANS_ENABLED` | optional | `true` aktiviert die Benutzerlevel „Start“ und „Komplett“, siehe [Benutzerlevel](#benutzerlevel-optional) |
| `STRIPE_…` | optional | „Komplett“ als Abo buchen, siehe [Stripe](#stripe-komplett-als-abo-optional) |

Die App lauscht intern auf **127.0.0.1:3001** (siehe `npm start` in `package.json`).

## 3. Datenbank

Leere Datenbank anlegen, dann Migrationen ausführen:

```bash
npm run db:migrate
```

Bei Schema-Updates nach einem Git-Pull erneut `npm run db:migrate` ausführen, danach `npm run build` (generiert den Prisma Client automatisch neu).

## 4. Build und Start

```bash
npm run build
npm run start
```

Ablauf von `npm run build`:

1. `prisma generate` — Client aus `prisma/schema.prisma`
2. `scripts/verify-prisma-client.mjs` — prüft Schema, generierten Client und eine Mini-Typecheck-Runde
3. `npm run typecheck` — TypeScript 7 (`typescript-7`-Alias); löscht vorher die Route-Typen des letzten Builds (`.next/types`), damit entfernte Routen nicht als Fehler auftauchen – `next build` erzeugt und prüft sie neu
4. `next build`

Typecheck und Next.js-Build nutzen `@typescript/native-preview` als Marker (TS 7 hat keine `lib/typescript.js`-API mehr). ESLint und andere Tooling-Peers nutzen das reguläre `typescript@6`-Paket — kein npm-Alias auf dem Namen `typescript`, damit `npm install` bei Updates stabil bleibt.

Produktionsbetrieb mit **PM2** (empfohlen). Die App-Scripts in `package.json` enthalten keine `pm2:*`-Kurzbefehle mehr — PM2 direkt nutzen, Konfiguration in [`ecosystem.config.js`](ecosystem.config.js):

```bash
mkdir -p logs
pm2 start ecosystem.config.js --env production
```

Weitere Befehle: `pm2 restart konto-planer`, `pm2 logs konto-planer`, `pm2 stop konto-planer`.

**Speichergrenze:** `max_memory_restart` steht in `ecosystem.config.js` auf `512M`. PM2 startet die App neu, sobald sie mehr belegt. Im Normalbetrieb braucht sie rund 230–260 MB (Next.js + Prisma); die Grenze soll nur echte Speicherlecks abfangen. Auf sehr kleinen Servern ggf. auf `384M` senken — nicht unter den Normalverbrauch, sonst startet PM2 die App im Dauerlauf neu. Eine geänderte Grenze greift erst nach dem Neu-Registrieren des Prozesses (`pm2 delete` / `pm2 start` / `pm2 save`, siehe unten), nicht nach `pm2 restart`.

Nach einem **Node-/NVM-Upgrade** PM2-Prozess neu registrieren (alter `node`-Pfad wird sonst gecacht):

```bash
pm2 delete konto-planer
pm2 start ecosystem.config.js --env production
pm2 save
```

### Cleanup unbestätigter Konten (Cron)

Unbestätigte Registrierungen ohne gültigen Verifizierungs-Token werden gelöscht. Empfehlung: stündlich per Cron:

```bash
0 * * * * cd /pfad/zu/konto-planer && npm run db:cleanup-unverified >> /var/log/konto-planer-cleanup.log 2>&1
```

Manuell: `npm run db:cleanup-unverified`

### Benutzerlevel (optional)

Mit `PLANS_ENABLED=true` gelten zwei Level; was welches Level darf, steht an einer Stelle in [`src/lib/plans.ts`](src/lib/plans.ts). Ohne den Schalter haben alle Nutzer „Komplett“, und Level, Verwaltung und Kauf sind ausgeblendet.

| | Start (kostenlos) | Komplett |
|---|---|---|
| Eigene Konten | 1 | unbegrenzt |
| Buchungen, wiederkehrende Zahlungen, Übersicht, Backup | ja | ja |
| CSV-Import, Statistiken, Konto teilen | – | ja |
| Eigene Split-Listen (mit Freigabe-Link und Fremdwährungen) | – | ja |
| Eingeladen mitmachen (geteiltes Konto, Split-Liste) | ja | ja |

- **Wessen Level zählt:** Was jemand selbst anlegt (Konten, Split-Listen), richtet sich nach dem eigenen Level. Was in einem Konto oder einer Split-Liste möglich ist, richtet sich nach dem Level des Inhabers bzw. Erstellers – Eingeladene nutzen mit.
- **Testphase:** Neue Nutzer bekommen ab der bestätigten E-Mail-Adresse 14 Tage „Komplett“, danach gilt „Start“. Die Frist läuft auch, solange `PLANS_ENABLED` aus ist.
- **Bestand:** Wer beim Einspielen der Migration `20261005100000_user_plans` schon registriert war, hat „Komplett“ dauerhaft.
- **Herabstufung:** Es wird nichts gelöscht. Überzählige eigene Konten und eigene Split-Listen sind nur lesbar, der Freigabe-Link ruht, Mitglieder geteilter Konten haben nur Lesezugriff. Ansehen, Backup-Export und Löschen bleiben möglich.
- **Beschreibbares Konto:** Wer nach einer Herabstufung mehrere eigene Konten hat, wird beim nächsten Aufruf der App in einem Dialog gefragt, welches beschreibbar bleibt. „Später entscheiden“ verschiebt die Frage auf den nächsten Besuch; bis dahin bleibt das bisherige (zunächst das älteste) Konto beschreibbar. Die Wahl nach einer Herabstufung ist immer frei, danach ist ein Wechsel in den Einstellungen nur einmal in 60 Tagen möglich (`KEPT_ACCOUNT_CHANGE_DAYS`).

`PLANS_ENABLED` wird für Startseite und Registrierung beim Build übernommen, in der App zur Laufzeit. Nach einer Änderung deshalb neu bauen **und** neu starten – sonst passen Startseite und App kurz nicht zusammen.

#### Verwaltung

Admins sehen den Menüpunkt „Verwaltung“ (`/admin`): Nutzerliste mit E-Mail-Suche, Level, Quelle (Bestand, Testphase, von Hand, Abo), Ablauf, letzter Anmeldung und Anzahl der Konten und Split-Listen – ohne Finanzdaten. Dort lässt sich ein Level von Hand setzen (optional befristet, mit Notiz und Verlauf) und ein Nutzer samt eigener Daten löschen. Konten, die er mit anderen teilt, bleiben den anderen erhalten. Admins und die eigene Anmeldung lassen sich dort nicht löschen.

„Letzte Anmeldung“ ist die letzte Anmeldung mit Passwort; eine Sitzung gilt bis zu 30 Tage.

Admin-Recht vergeben bzw. entziehen:

```bash
npm run set-admin nutzer@beispiel.de
npm run set-admin nutzer@beispiel.de --remove
```

### Rechtstexte (optional)

Impressum, Datenschutz, AGB und Widerruf liegen als Textdateien unter `content/legal/` (siehe [`content/legal/README.md`](content/legal/README.md)): `impressum.md`, `datenschutz.md`, `agb.md`, `widerruf.md`. Eine Seite (`/impressum` usw., ohne Anmeldung erreichbar) und die Verweise darauf in Startseite, Anmeldeseiten und Einstellungen gibt es nur, wenn die Datei vorhanden ist. Nach dem Anlegen oder Ändern neu bauen. Die Dateien sind von der Versionsverwaltung ausgenommen, weil jede Installation eigene Texte hat.

### Stripe: „Komplett“ als Abo (optional)

Mit Stripe lässt sich „Komplett“ als Abo buchen (monatlich oder jährlich, kündbar zum Periodenende). Voraussetzung ist `PLANS_ENABLED=true`. Ohne Stripe-Angaben bleibt es bei der Vergabe von Hand in der Verwaltung.

**So arbeitet die Anbindung**

- Bezahlt wird auf der von Stripe gehosteten Bezahlseite; Zahlungsmittel, Rechnungen und Intervallwechsel liegen im Stripe-Kundenportal. Die App speichert keine Zahlungsdaten, nur Kunden- und Abo-Kennung.
- Das Level setzt ein Abgleich mit Stripe (`syncCustomer` in [`src/lib/billing.ts`](src/lib/billing.ts)). Er holt immer den aktuellen Stand bei Stripe und wird ausgelöst durch den Webhook, bei der Rückkehr vom Kauf oder aus dem Kundenportal, im Hintergrund beim Öffnen von Einstellungen → „Dein Level“ (höchstens alle 5 Minuten je Nutzer), über „Mit Stripe abgleichen“ in der Verwaltung und optional täglich per Cron (siehe unten). Geht ein Webhook verloren, stimmt der Stand also spätestens, wenn der Nutzer nachsieht. „Komplett“ gilt bis zum Ende des bezahlten Zeitraums plus 3 Tage Kulanz; nach einer Kündigung genau bis zum Periodenende.
- Von Hand oder als Bestand vergebenes „Komplett“ wird nie überschrieben; diese Nutzer bekommen kein Kaufangebot.
- Wer in der Testphase bucht, zahlt erst ab deren Ende (bei weniger als rund zwei Tagen Rest sofort).
- Wird ein Nutzer gelöscht (selbst oder über die Verwaltung), beendet die App vorher sein laufendes Abo. Ist Stripe nicht erreichbar, wird nicht gelöscht.
- Eine geänderte E-Mail-Adresse wird an Stripe weitergegeben.

**Umgebungsvariablen**

| Variable | Beschreibung |
|----------|--------------|
| `STRIPE_SECRET_KEY` | Geheimer API-Schlüssel (`sk_test_…` bzw. `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Signatur-Schlüssel des Webhook-Endpunkts (`whsec_…`) |
| `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` | Preis-Kennungen des Abos (`price_…`) |
| `STRIPE_PORTAL_CONFIGURATION` | optional: Einstellung des Kundenportals (`bpc_…`); ohne Angabe gilt die Standard-Einstellung des Stripe-Kontos |
| `CRON_SECRET` | optional: Geheimnis für den täglichen Abgleich (`/api/cron/stripe-sync`); ohne den Wert gibt es die Route nicht |
| `STRIPE_TOS_CONSENT` | optional: `true` verlangt auf der Bezahlseite die Zustimmung zu den AGB. Die AGB-Adresse muss dafür bei Stripe hinterlegt sein, sonst schlägt der Kauf fehl |

Die ersten vier gehören zusammen: Nur wenn alle gesetzt sind, ist der Kauf aktiv. Ist nur ein Teil gesetzt, startet die App in Produktion nicht. Auch dieser Zustand wird für Startseite und Fußzeilen beim Build übernommen – nach einer Änderung neu bauen.

#### Einrichten im Testmodus (lokal)

Gebraucht werden ein Stripe-Konto mit Sandbox bzw. Testmodus und die [Stripe-CLI](https://docs.stripe.com/stripe-cli).

1. **Schlüssel:** Im Stripe-Dashboard im Testmodus den geheimen Schlüssel kopieren und als `STRIPE_SECRET_KEY=sk_test_…` in die `.env` eintragen.
2. **Produkt, Preise, Kundenportal anlegen:**

   ```bash
   npm run stripe:setup
   ```

   Das Skript ([`scripts/stripe-setup.mjs`](scripts/stripe-setup.mjs)) legt das Produkt „KontoPlaner Komplett“, die beiden Preise (3 € monatlich, 24 € jährlich) und eine Kundenportal-Einstellung an und gibt die Zeilen `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` und `STRIPE_PORTAL_CONFIGURATION` für die `.env` aus. Es kann mehrfach laufen und legt nichts doppelt an. Einen Live-Schlüssel nimmt es nur mit `--live` an.
3. **CLI anmelden und das richtige Konto wählen:**

   ```bash
   stripe login
   stripe switch
   ```

   Die CLI muss auf **dasselbe** Stripe-Konto bzw. dieselbe Sandbox zeigen wie der Schlüssel in der `.env` – bei mehreren Sandboxes ist das nicht selbstverständlich. Lauscht sie auf ein anderes Konto, kommen keine Ereignisse an.
4. **Webhook weiterleiten:**

   ```bash
   stripe listen --all-snapshot --forward-to localhost:3000/api/stripe/webhook
   ```

   Die CLI zeigt beim Start einen Signatur-Schlüssel (`whsec_…`). Als `STRIPE_WEBHOOK_SECRET` eintragen und die CLI laufen lassen. **Lokal kommen Ereignisse nur an, solange `stripe listen` läuft** – Stripe stellt verpasste Ereignisse über die CLI nicht erneut zu. Den Stand holt sich die App dann beim nächsten Öffnen von „Dein Level“.
5. **Dev-Server neu starten** (`npm run dev`), damit die neuen Werte gelten.
6. **Ausprobieren:** Mit einem Nutzer auf „Start“ unter Einstellungen → „Dein Level“ „Komplett buchen“. Auf der Stripe-Seite Stripes Testkarte `4242 4242 4242 4242` mit beliebigem künftigem Datum und beliebiger Prüfziffer verwenden. Nach der Rückkehr steht dort „Jahres-Abo – verlängert sich am …“; die CLI zeigt die zugestellten Ereignisse mit `[200]`.

#### Einrichten für den Live-Betrieb

1. **Rechtstexte** unter `content/legal/` anlegen (Impressum, Datenschutz, AGB, Widerruf).
2. **Stripe-Dashboard (Live-Modus):** Firmenangaben, Zahlungsarten, E-Mail-Belege und Rechnungsvorlage einrichten (als Kleinunternehmer mit Hinweis nach § 19 UStG).
3. **Schlüssel und Preise:** Live-Schlüssel als `STRIPE_SECRET_KEY` in die `.env` des Servers, dann `npm run stripe:setup -- --live` und die ausgegebenen Zeilen eintragen.
4. **Testdaten aufräumen:** Haben Nutzer in dieser Datenbank Kunden aus der Sandbox (z. B. von Testkäufen), kennt Stripe sie mit dem Live-Schlüssel nicht – für sie scheitern dann „Abo verwalten“ und der Kauf. `npm run stripe:cleanup` listet diese Nutzer (ändert nichts), `npm run stripe:cleanup -- --apply` leert ihre Stripe-Felder. Kam ihr Level aus dem Test-Abo, fällt es auf „Start“ zurück (mit Eintrag im Protokoll); von Hand vergebenes „Komplett“ und Bestand bleiben. Das Skript läuft nur mit einem Live-Schlüssel und bricht bei jedem anderen Stripe-Fehler ab, ohne etwas zu ändern.
5. **Webhook:** im Dashboard unter Entwickler → Webhooks ein Ereignisziel auf `https://<Domain>/api/stripe/webhook` anlegen, **Nutzlast-Stil „Snapshot“**, mit den Ereignissen `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`, `customer.deleted`. Dessen Signatur-Schlüssel als `STRIPE_WEBHOOK_SECRET` eintragen. Ein Ziel mit Nutzlast-Stil „Thin“ schickt nur eine Kurzform (`v2.core.event`), die die App nicht verarbeiten kann; der Stil lässt sich nachträglich nicht ändern, dann ein neues Ziel anlegen.
6. Optional `STRIPE_TOS_CONSENT=true`, wenn die AGB-Adresse bei Stripe hinterlegt ist.
7. `PLANS_ENABLED=true`, neu bauen (`npm run build`), neu starten.
8. **Abnahme:** ein echter Kauf, Kündigung unter `/kuendigen`, Kontrolle im Stripe-Dashboard.

Die Preise auf der Startseite und in den Einstellungen stehen in `PLAN_PRICE` ([`src/lib/plans.ts`](src/lib/plans.ts)), die Beträge für Stripe in `scripts/stripe-setup.mjs`. Beide müssen zusammenpassen; ein bestehender Stripe-Preis wird vom Skript nicht verändert.

#### Test-Server mit Sandbox

Ein öffentlich erreichbarer Test-Server (z. B. `dev.ihre-domain.de`) bekommt Ereignisse direkt von Stripe, ohne CLI:

1. In der `.env` des Test-Servers die **Sandbox**-Schlüssel und -Preise eintragen (dieselben wie lokal oder per `npm run stripe:setup` mit dem Sandbox-Schlüssel).
2. In derselben Sandbox ein Ereignisziel (Snapshot, siehe oben) auf `https://<Test-Server>/api/stripe/webhook` anlegen und **dessen** Signatur-Schlüssel als `STRIPE_WEBHOOK_SECRET` eintragen – nicht den der CLI.
3. Der Pfad `/api/stripe/webhook` muss für Stripe erreichbar sein; steht der Test-Server hinter Passwortschutz oder IP-Sperre, diesen Pfad ausnehmen.
4. Neu bauen und neu starten; im Dashboard beim Ziel „Ereignisübermittlungen“ prüfen (Antwort 200).

Nutzen lokale Entwicklung und Test-Server dieselbe Sandbox, bekommt der Test-Server auch die Ereignisse lokaler Testkäufe. Kunden, die er nicht kennt, ignoriert die App.

#### Täglicher Abgleich (empfohlen)

Zusätzlich zum Webhook kann ein Cron-Eintrag einmal täglich alle laufenden Abos mit Stripe abgleichen. Das fängt Verlängerungen, Kündigungen und Zahlungsausfälle ab, deren Webhook nicht angekommen ist. Dafür ein langes Zufallsgeheimnis als `CRON_SECRET` in die `.env` (z. B. `openssl rand -hex 32`) und:

```bash
15 4 * * * curl -fsS -X POST -H "Authorization: Bearer <CRON_SECRET>" https://<Domain>/api/cron/stripe-sync >> /var/log/konto-planer-stripe-sync.log 2>&1
```

Die Antwort nennt, wie viele Abos abgeglichen wurden und wie viele Abgleiche fehlschlugen (`{"synced": …, "failed": …}`); Details zu Fehlern stehen im App-Log.

#### Gutschein-Codes

Die Bezahlseite zeigt ein Feld für Aktionscodes. Die Codes legst du im Stripe-Dashboard an (Produktkatalog → Gutscheine): erst einen Gutschein mit Rabatt (Prozent oder Betrag, einmalig, für einige Monate oder dauerhaft), dann dazu einen Aktionscode, den Kunden eingeben (z. B. `START2026`). Einschränkungen wie Ablaufdatum, Höchstzahl an Einlösungen oder „nur für Erstkunden“ stellst du dort ein. Ein Rabatt von 100 % auf den ersten Zeitraum verschenkt „Komplett“ ohne Zahlung; das Abo läuft danach zum normalen Preis weiter, bis es gekündigt wird.

Ohne angelegte Codes bleibt das Feld wirkungslos; ein falscher Code wird von Stripe abgelehnt.

#### Zahlungsarten und SEPA-Lastschrift

Die App legt keine Zahlungsarten fest. Welche auf der Bezahlseite erscheinen (Karte, SEPA-Lastschrift, PayPal, Klarna …), stellst du im Stripe-Dashboard unter Einstellungen → Zahlungsmethoden ein – getrennt für Sandbox und Live-Modus. Stripe zeigt nur die Arten an, die zu Währung (Euro) und Abo passen.

**SEPA-Lastschrift** lässt sich dort zuschalten; die App muss dafür nicht geändert werden. Stripe zeigt beim Abschluss das Lastschriftmandat an und zieht die Beträge danach automatisch ein.

- **Kosten** (Stripe-Standardpreise Deutschland): 0,35 € je Lastschrift; europäische Karten 1,5 % + 0,25 €.
- **Verzögerte Bestätigung:** Eine Lastschrift ist erst nach einigen Tagen sicher. Das Abo steht bei Stripe trotzdem sofort auf „aktiv“, und die App gibt „Komplett“ gleich frei. Das Ergebnis meldet Stripe mit `checkout.session.async_payment_succeeded` bzw. `…_failed` (beide im Ereignisziel auswählen). Schlägt die Lastschrift fehl, steht das Abo auf „Zahlung offen“; die App zeigt unter „Dein Level“ den Hinweis, das Zahlungsmittel zu prüfen, und „Komplett“ gilt weiter.
- **Nach erfolglosen Wiederholungen:** Was dann passiert, legst du im Dashboard fest (Einstellungen → Billing → Abonnements und E-Mails → Verwaltung fehlgeschlagener Zahlungen). Empfohlen: das Abo nach dem letzten Versuch **kündigen** oder **als unbezahlt markieren** – in beiden Fällen fällt das Level auf „Start“. Bleibt das Abo stattdessen „überfällig“, gilt es für die App weiter als laufend, und „Komplett“ bleibt erhalten.
- **Rückbuchungen:** Zahler können autorisierte Lastschriften 8 Wochen lang ohne Begründung zurückgeben. Das wickelt Stripe ab; die App reagiert nur, wenn sich dadurch der Abo-Stand ändert.
- **Testen:** In der Sandbox stellt Stripe Test-IBANs bereit, z. B. `DE89370400440532013000` (erfolgreich) und `DE62370400440532013001` (schlägt fehl); das Ergebnis kommt nach wenigen Sekunden bis Minuten. Stripe verlangt bei Lastschrift eine Rechnungsadresse.

#### Kündigen

- **Angemeldet:** unter `/kuendigen` (Verweis „Abo kündigen“ in den Einstellungen) oder im Stripe-Kundenportal, jeweils zum Ende des bezahlten Zeitraums. Die App bestätigt die Kündigung per E-Mail.
- **Ohne Anmeldung:** Unter `/kuendigen` gibt man die E-Mail-Adresse an. Gibt es dazu ein laufendes Abo, schickt die App einen Link an genau diese Adresse (24 Stunden gültig, nur einmal verwendbar). Auf der Seite `/kuendigen/bestaetigen` wird die Kündigung per Knopf bestätigt und dann automatisch zum Periodenende ausgeführt, mit Bestätigung per E-Mail. So kann niemand das Abo einer fremden Adresse kündigen. Die Seite antwortet immer gleich und verrät nicht, ob es Adresse oder Abo gibt; ohne Abo wird nichts verschickt.
- Der Verweis „Verträge hier kündigen“ erscheint in den Fußzeilen, sobald der Kauf aktiv ist.

## 5. Reverse-Proxy

Die App ist nur lokal erreichbar. Der Proxy leitet HTTPS-Anfragen an Port **3001** weiter.

**nginx** (Auszug):

```nginx
server {
    listen 443 ssl http2;
    server_name ihre-domain.de;

    # SSL-Zertifikate (z. B. Let's Encrypt) …

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`AUTH_URL` muss exakt der öffentlichen URL entsprechen (z. B. `https://ihre-domain.de`).

**Client-IP für Rate-Limits** (`TRUST_PROXY=true`): Die App nimmt zuerst `X-Real-IP`, sonst den **letzten** Eintrag von `X-Forwarded-For` – frühere Einträge kann der Client selbst mitschicken. Der Proxy muss `X-Real-IP` deshalb selbst setzen (wie oben) und darf ihn nicht vom Client durchreichen. Caddy setzt `X-Forwarded-For` korrekt; dort zusätzlich `header_up X-Real-IP {remote_host}` eintragen.

## 6. Updates deployen

```bash
git pull
npm install
npm run db:migrate
npm run build
pm2 restart konto-planer
```

Reihenfolge einhalten: Nach einer Migration muss die App neu gebaut **und** neu gestartet werden. Läuft der alte Prozess weiter, kennt er neue Spalten nicht (Fehler 500 in den betroffenen Bereichen). Auch `PLANS_ENABLED`, die Stripe-Angaben und die Rechtstexte wirken auf Startseite und Fußzeilen erst nach einem neuen Build.

**Hinweis zur Migration `20261021100000_recurring_auto_pending`:** Danach tragen alle Planungskonten wiederkehrende Zahlungen automatisch ein (Vorgabe „Zu Beginn des Gehaltsmonats“, änderbar unter Einstellungen → Kontodaten). Beim ersten Öffnen erscheinen die fälligen Zahlungen des laufenden Gehaltsmonats einmalig mit Meldung und „Rückgängig“; frühere Monate werden nicht nachgetragen.

Bei hartnäckigen Build-Problemen:

```bash
rm -rf prisma/node_modules node_modules/.prisma tsconfig.tsbuildinfo .next
npm install
npm run build
pm2 restart konto-planer
```

Bei fehlenden JS-Chunks nach dem Deploy reicht oft: `rm -rf .next && npm run build && pm2 restart konto-planer`.

## 7. Tests (optional)

```bash
npm test
npm run lint
npm run audit:check
```

**E-Mails ansehen ohne Versand:** `npm run email:preview` schreibt alle E-Mails (Registrierung, neue Adresse, Passwort, „Bereits registriert“, Kündigung) als HTML- und Text-Datei nach `.email-preview/` (nicht im Repository); `index.html` dort im Browser öffnen. Verweise auf Rechtstexte in der Fußzeile erscheinen mit `NEXT_PUBLIC_LEGAL_PAGES=impressum,datenschutz npm run email:preview`. Alle E-Mails nutzen die gemeinsame Vorlage `src/lib/emailLayout.ts`, die Texte stehen in `src/lib/emailTemplates.ts`.

## Paket-Updates und Sicherheit

Empfohlener Ablauf bei Dependency-Updates:

1. `ncu` / `ncu -u` (Versionen in `package.json` anheben; `typescript` und `typescript-7` sind in [`.ncurc.json`](.ncurc.json) ausgenommen — Side-by-Side TS6/TS7)
2. `npm install` (Lockfile neu auflösen)
3. `npm audit fix` (**ohne** `--force`)
4. Verbleibende transitive Lücken: gezieltes `overrides` in `package.json`, **nicht** `npm audit fix --force`
5. `npm run typecheck && npm run lint && npm test && npm run build`
6. Prisma-Pakete synchron halten: `prisma`, `@prisma/client`, `@prisma/adapter-mariadb` auf gleiche Minor
7. `allowScripts` bei Prisma-Versionswechsel anpassen

Lokal prüfen: `npm run audit:check` (High/Critical müssen 0 sein). Geprüft wird, was auf dem Server läuft (`--omit=dev`); der CI bricht nur daran ab.

`npm run audit:all` bezieht die Entwicklungswerkzeuge (ESLint, Tests) ein. Der CI führt das zusätzlich als reinen Hinweis aus. Derzeit meldet auch das keine Lücken; `braces` ist über den `tinyglobby`-Override (siehe unten) aus dem Baum entfernt.

**`npm audit fix --force` nie ausführen** — downgraded Prisma, Next oder ESLint und bricht den Stack.

### npm overrides (transitive Abhängigkeiten)

| Override | Grund | Betroffener Pfad |
|----------|-------|------------------|
| `mariadb@^3.5.4` | SSL/Credential-CVEs im DB-Treiber | Runtime: `@prisma/adapter-mariadb` → App |
| `mysql2@^3.24.3` | Auth-Plugin-Downgrade (Prisma-CLI) | Dev/Deploy: `prisma migrate` |
| `nodemailer@^10.1.7` | SMTP-Client auf aktueller Major | Runtime: E-Mail-Versand |
| `eslint@10.13.0` | Tooling-Peers auf ESLint 10 halten | Dev: Lint/CI |
| `sharp@^0.35.0` | libvips-CVEs | Next.js Build / Image-Opt |
| `deepmerge-ts@^8.0.0` | Stack-Exhaustion | Prisma-CLI |
| `nanoid@^3.3.18` | Generator-Loop | Next.js |
| `find-my-way`, `valibot` | Prisma-Dev-CLI | Nur Entwicklung |
| `brace-expansion@^5.0.8` | ReDoS | ESLint-Plugins |
| `postcss@^8.5.31`, `@hono/node-server@^1.19.13` | gemeldete Lücken in transitiven Paketen | Build bzw. Prisma-Dev-CLI |
| `@next/eslint-plugin-next` → `fast-glob` = `npm:tinyglobby@^0.2.17` | `fast-glob` zieht `micromatch` → `braces` (Stack-Exhaustion, GHSA-vfj7-8cjw-p6xm; `braces` wird nicht mehr gepflegt). Das Plugin nutzt nur `globSync(…, { onlyDirectories: true })` für `settings.next.rootDir` – `tinyglobby` bietet dieselbe Funktion ohne `braces` | Dev: Lint/CI |

Bei `@prisma/adapter-mariadb`-Updates prüfen, ob Prisma den `mariadb`-Treiber offiziell anhebt — dann Override ggf. entfernen. Bei `eslint-config-next`-Updates prüfen, ob `@next/eslint-plugin-next` `fast-glob` noch verwendet; falls nicht, den `tinyglobby`-Override entfernen.

### DB-Sicherheit

- Die App lauscht nur auf `127.0.0.1:3001` (nicht öffentlich).
- Datenbank idealerweise auf `localhost`; bei Remote-DB TLS mit verifizierter CA nutzen, nicht nur `ssl=true` ohne Zertifikatsprüfung.
- Rate-Limits (Login, Registrierung, Import, …) liegen im Arbeitsspeicher des Prozesses ([`src/lib/rate-limit.ts`](src/lib/rate-limit.ts)). Sie gelten daher nur zuverlässig mit **einer** Instanz (`instances: 1` in `ecosystem.config.js`) und werden bei jedem Neustart zurückgesetzt.

## Fehlersuche

| Problem | Hinweis |
|---------|---------|
| PM2: `Cannot find module '.../v24.../bin/npm'` oder alter Node-Pfad | Node-Version gewechselt; `pm2 delete konto-planer && pm2 start ecosystem.config.js --env production && pm2 save` |
| `npm audit fix --force` bricht Abhängigkeiten | **Nicht ausführen** — downgraded Prisma/Next/ESLint. Stattdessen gezielte `overrides` in `package.json` oder `npm audit fix` ohne `--force` |
| Audit meldet `mariadb`/`mysql2` | `overrides` in `package.json` prüfen; `npm install` und `npm run audit:check` |
| App startet häufig neu (↺ in `pm2 list` steigt) | `grep -i memory ~/.pm2/pm2.log \| tail` — bei „exceeds --max-memory-restart“ ist `max_memory_restart` in `ecosystem.config.js` zu niedrig (Standard `512M`); danach Prozess neu registrieren. Sonst `pm2 logs konto-planer --err` auf Abstürze prüfen |
| Start bricht sofort ab | Pflicht-Env in Produktion prüfen (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `TRUST_PROXY`, SMTP-Variablen); Stripe-Angaben entweder vollständig oder gar nicht setzen |
| Keine Bestätigungs-E-Mail | SMTP-Zugangsdaten und `AUTH_URL` prüfen; Spam-Ordner |
| Login-Redirect falsch | `AUTH_URL` muss die öffentliche HTTPS-URL sein |
| `splitListCurrency` / Prisma-Typecheck-Fehler | Veralteter Client in `prisma/node_modules`: `rm -rf prisma/node_modules node_modules/.prisma tsconfig.tsbuildinfo && npm install && npm run build` |
| Verify-Script schlägt fehl | Schema und generierter Client passen nicht zusammen — siehe Zeile oben |
| `Unknown field` / Prisma-Laufzeitfehler | `git pull`, dann `npm run db:migrate`, `npm run build` **und Neustart** – ein noch laufender Prozess kennt neue Spalten nicht |
| Kaufangebot fehlt trotz Stripe-Angaben | Alle vier Pflicht-Angaben gesetzt? `PLANS_ENABLED=true`? Nach Änderungen neu gebaut und neu gestartet? Nutzer mit dauerhaftem „Komplett“ bekommen kein Angebot |
| Kauf bezahlt, Level bleibt „Start“ oder Kündigung erscheint nicht | Webhook kommt nicht an: Ereignisziel im Dashboard prüfen (Adresse, Ereignisse, Nutzlast-Stil „Snapshot“, Reiter „Ereignisübermittlungen“); lokal muss `stripe listen` laufen und auf dasselbe Konto zeigen wie der Schlüssel (`stripe switch`). Sofort beheben: Einstellungen → „Dein Level“ öffnen oder in der Verwaltung „Mit Stripe abgleichen“ |
| Kunde im Stripe-Dashboard gelöscht | Die App löst die Verknüpfung über `customer.deleted`; beim nächsten Kauf legt sie in jedem Fall einen neuen Kunden an. Frühere Rechnungen des gelöschten Kunden sind dann nur noch im Dashboard zu sehen |
| Ereignisübermittlungen zeigen `v2.core.event` | Ereignisziel mit Nutzlast-Stil „Thin“ – durch ein neues Ziel mit „Snapshot“ ersetzen |
| Webhook antwortet mit 400 „Ungültige Signatur“ | `STRIPE_WEBHOOK_SECRET` passt nicht zum Endpunkt (Test/Live verwechselt, CLI-Schlüssel geändert) |
| Webhook antwortet mit 503 | `STRIPE_SECRET_KEY` oder `STRIPE_WEBHOOK_SECRET` fehlt |
| „Abo verwalten“ schlägt fehl | Kundenportal im Stripe-Konto nicht eingerichtet: `npm run stripe:setup` ausführen und `STRIPE_PORTAL_CONFIGURATION` eintragen |
| Kauf schlägt mit `STRIPE_TOS_CONSENT=true` fehl | AGB-Adresse im Stripe-Dashboard hinterlegen oder die Variable entfernen |
| Verwaltung nicht erreichbar (404) | `PLANS_ENABLED=true` und Admin-Recht (`npm run set-admin`) nötig |
| Endlos-Ladebalken / Chunk-Fehler 500 | Unvollständiger Build: `rm -rf .next && npm run build && pm2 restart konto-planer` |
| 502 vom Proxy | App läuft? `curl -I http://127.0.0.1:3001` |

Logs bei PM2: `./logs/pm2-*.log` oder `pm2 logs konto-planer`.

Weitere API-Details: [API.md](API.md) · Logging: [LOGGING.md](LOGGING.md)
