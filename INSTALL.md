# Installation (Server)

Anleitung zum Betrieb von Konto-Planer auf einem Linux-Server (z. B. VPS mit nginx/Caddy davor).

## Voraussetzungen

- **Node.js 20+** und npm
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
| `STRIPE_…`, `BILLING_CONTACT_EMAIL` | optional | „Komplett“ als Abo buchen, siehe [Stripe](#stripe-komplett-als-abo-optional) |

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
3. `npm run typecheck` — TypeScript 7 (`typescript-7`-Alias)
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
- Das Level setzt ein Abgleich mit Stripe (`syncCustomer` in [`src/lib/billing.ts`](src/lib/billing.ts)), ausgelöst durch den Webhook und bei der Rückkehr vom Kauf. „Komplett“ gilt bis zum Ende des bezahlten Zeitraums plus 3 Tage Kulanz; nach einer Kündigung genau bis zum Periodenende.
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
| `STRIPE_TOS_CONSENT` | optional: `true` verlangt auf der Bezahlseite die Zustimmung zu den AGB. Die AGB-Adresse muss dafür bei Stripe hinterlegt sein, sonst schlägt der Kauf fehl |
| `BILLING_CONTACT_EMAIL` | optional: Empfänger für Kündigungen ohne Anmeldung (Vorgabe: Adresse aus `SMTP_FROM`) |

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

   Die CLI zeigt beim Start einen Signatur-Schlüssel (`whsec_…`). Als `STRIPE_WEBHOOK_SECRET` eintragen und die CLI laufen lassen.
5. **Dev-Server neu starten** (`npm run dev`), damit die neuen Werte gelten.
6. **Ausprobieren:** Mit einem Nutzer auf „Start“ unter Einstellungen → „Dein Level“ „Komplett buchen“. Auf der Stripe-Seite Stripes Testkarte `4242 4242 4242 4242` mit beliebigem künftigem Datum und beliebiger Prüfziffer verwenden. Nach der Rückkehr steht dort „Jahres-Abo – verlängert sich am …“; die CLI zeigt die zugestellten Ereignisse mit `[200]`.

#### Einrichten für den Live-Betrieb

1. **Rechtstexte** unter `content/legal/` anlegen (Impressum, Datenschutz, AGB, Widerruf).
2. **Stripe-Dashboard (Live-Modus):** Firmenangaben, Zahlungsarten, E-Mail-Belege und Rechnungsvorlage einrichten (als Kleinunternehmer mit Hinweis nach § 19 UStG).
3. **Schlüssel und Preise:** Live-Schlüssel als `STRIPE_SECRET_KEY` in die `.env` des Servers, dann `npm run stripe:setup -- --live` und die ausgegebenen Zeilen eintragen.
4. **Webhook:** im Dashboard einen Endpunkt auf `https://<Domain>/api/stripe/webhook` anlegen mit den Ereignissen `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`. Dessen Signatur-Schlüssel als `STRIPE_WEBHOOK_SECRET` eintragen.
5. Optional `STRIPE_TOS_CONSENT=true`, wenn die AGB-Adresse bei Stripe hinterlegt ist.
6. `PLANS_ENABLED=true`, neu bauen (`npm run build`), neu starten.
7. **Abnahme:** ein echter Kauf, Kündigung unter `/kuendigen`, Kontrolle im Stripe-Dashboard.

Die Preise auf der Startseite und in den Einstellungen stehen in `PLAN_PRICE` ([`src/lib/plans.ts`](src/lib/plans.ts)), die Beträge für Stripe in `scripts/stripe-setup.mjs`. Beide müssen zusammenpassen; ein bestehender Stripe-Preis wird vom Skript nicht verändert.

#### Gutschein-Codes

Die Bezahlseite zeigt ein Feld für Aktionscodes. Die Codes legst du im Stripe-Dashboard an (Produktkatalog → Gutscheine): erst einen Gutschein mit Rabatt (Prozent oder Betrag, einmalig, für einige Monate oder dauerhaft), dann dazu einen Aktionscode, den Kunden eingeben (z. B. `START2026`). Einschränkungen wie Ablaufdatum, Höchstzahl an Einlösungen oder „nur für Erstkunden“ stellst du dort ein. Ein Rabatt von 100 % auf den ersten Zeitraum verschenkt „Komplett“ ohne Zahlung; das Abo läuft danach zum normalen Preis weiter, bis es gekündigt wird.

Ohne angelegte Codes bleibt das Feld wirkungslos; ein falscher Code wird von Stripe abgelehnt.

#### Zahlungsarten und SEPA-Lastschrift

Die App legt keine Zahlungsarten fest. Welche auf der Bezahlseite erscheinen (Karte, SEPA-Lastschrift, PayPal, Klarna …), stellst du im Stripe-Dashboard unter Einstellungen → Zahlungsmethoden ein – getrennt für Sandbox und Live-Modus. Stripe zeigt nur die Arten an, die zu Währung (Euro) und Abo passen.

**SEPA-Lastschrift** lässt sich dort zuschalten; die App muss dafür nicht geändert werden. Stripe zeigt beim Abschluss das Lastschriftmandat an und zieht die Beträge danach automatisch ein.

- **Kosten** (Stripe-Standardpreise Deutschland): 0,35 € je Lastschrift; europäische Karten 1,5 % + 0,25 €.
- **Verzögerte Bestätigung:** Eine Lastschrift ist erst nach einigen Tagen sicher. Das Abo steht bei Stripe trotzdem sofort auf „aktiv“, und die App gibt „Komplett“ gleich frei. Schlägt die Lastschrift fehl, geht das Abo in Verzug bzw. endet; die App gleicht über den Webhook ab, und das Level fällt nach den bekannten Regeln zurück.
- **Rückbuchungen:** Zahler können autorisierte Lastschriften 8 Wochen lang ohne Begründung zurückgeben. Das wickelt Stripe ab; die App reagiert nur, wenn sich dadurch der Abo-Stand ändert.
- **Testen:** In der Sandbox stellt Stripe Test-IBANs für erfolgreiche und fehlschlagende Lastschriften bereit; das Ergebnis kommt nach einigen Minuten.

#### Kündigen

- **Angemeldet:** unter `/kuendigen` (Verweis „Abo kündigen“ in den Einstellungen) oder im Stripe-Kundenportal, jeweils zum Ende des bezahlten Zeitraums. Die App bestätigt die Kündigung per E-Mail.
- **Ohne Anmeldung:** Das Formular unter `/kuendigen` schickt die Kündigung als Auftrag per E-Mail an `BILLING_CONTACT_EMAIL` und eine Eingangsbestätigung an die angegebene Adresse. Der Auftrag muss **von Hand** im Stripe-Dashboard umgesetzt werden.
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

`npm run audit:all` bezieht die Entwicklungswerkzeuge (ESLint, Tests) ein. Der CI führt das zusätzlich als reinen Hinweis aus. Dort kann eine Meldung offen bleiben, für die es noch keine bereinigte Version gibt – aktuell `braces` (über `eslint-config-next`, GHSA-vfj7-8cjw-p6xm): alle Versionen betroffen, kein Fix veröffentlicht, in der laufenden App nicht enthalten.

**`npm audit fix --force` nie ausführen** — downgraded Prisma, Next oder ESLint und bricht den Stack.

### npm overrides (transitive Abhängigkeiten)

| Override | Grund | Betroffener Pfad |
|----------|-------|------------------|
| `mariadb@^3.5.4` | SSL/Credential-CVEs im DB-Treiber | Runtime: `@prisma/adapter-mariadb` → App |
| `mysql2@^3.24.3` | Auth-Plugin-Downgrade (Prisma-CLI) | Dev/Deploy: `prisma migrate` |
| `nodemailer@^10.0.15` | SMTP-Client auf aktueller Major | Runtime: E-Mail-Versand |
| `eslint@10.12.0` | Tooling-Peers auf ESLint 10 halten | Dev: Lint/CI |
| `sharp@^0.35.0` | libvips-CVEs | Next.js Build / Image-Opt |
| `deepmerge-ts@^8.0.0` | Stack-Exhaustion | Prisma-CLI |
| `nanoid@^3.3.18` | Generator-Loop | Next.js |
| `find-my-way`, `valibot` | Prisma-Dev-CLI | Nur Entwicklung |
| `brace-expansion@^5.0.8` | ReDoS | ESLint-Plugins |
| `postcss@^8.5.29`, `@hono/node-server@^1.19.13` | gemeldete Lücken in transitiven Paketen | Build bzw. Prisma-Dev-CLI |

Bei `@prisma/adapter-mariadb`-Updates prüfen, ob Prisma den `mariadb`-Treiber offiziell anhebt — dann Override ggf. entfernen.

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
| Kauf bezahlt, Level bleibt „Start“ | Webhook kommt nicht an: Endpunkt-Adresse und Ereignisse im Dashboard prüfen; lokal muss `stripe listen` laufen und auf dasselbe Konto zeigen wie der Schlüssel (`stripe switch`) |
| Webhook antwortet mit 400 „Ungültige Signatur“ | `STRIPE_WEBHOOK_SECRET` passt nicht zum Endpunkt (Test/Live verwechselt, CLI-Schlüssel geändert) |
| Webhook antwortet mit 503 | `STRIPE_SECRET_KEY` oder `STRIPE_WEBHOOK_SECRET` fehlt |
| „Abo verwalten“ schlägt fehl | Kundenportal im Stripe-Konto nicht eingerichtet: `npm run stripe:setup` ausführen und `STRIPE_PORTAL_CONFIGURATION` eintragen |
| Kauf schlägt mit `STRIPE_TOS_CONSENT=true` fehl | AGB-Adresse im Stripe-Dashboard hinterlegen oder die Variable entfernen |
| Verwaltung nicht erreichbar (404) | `PLANS_ENABLED=true` und Admin-Recht (`npm run set-admin`) nötig |
| Endlos-Ladebalken / Chunk-Fehler 500 | Unvollständiger Build: `rm -rf .next && npm run build && pm2 restart konto-planer` |
| 502 vom Proxy | App läuft? `curl -I http://127.0.0.1:3001` |

Logs bei PM2: `./logs/pm2-*.log` oder `pm2 logs konto-planer`.

Weitere API-Details: [API.md](API.md) · Logging: [LOGGING.md](LOGGING.md)
