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

Die App lauscht intern auf **127.0.0.1:3001** (siehe `npm start` in `package.json`).

## 3. Datenbank

Leere Datenbank anlegen, dann Migrationen ausführen:

```bash
npm run db:migrate
```

Bei Schema-Updates nach einem Git-Pull erneut `npm run db:migrate` und danach `npx prisma generate` (falls der Client veraltet ist).

## 4. Build und Start

```bash
npm run build
npm run start
```

`npm run build` prüft zuerst die Typen mit TypeScript 7 (`typescript-7`-Alias), danach baut Next.js die App. Dafür ist `@typescript/native-preview` als Marker nötig (TS 7 hat keine `lib/typescript.js`-API mehr). ESLint und andere Tooling-Peers nutzen das reguläre `typescript@6`-Paket — kein npm-Alias auf dem Namen `typescript`, damit `npm install` bei Updates stabil bleibt.

Produktionsbetrieb mit **PM2** (empfohlen):

```bash
mkdir -p logs
npm run pm2:start
```

Weitere PM2-Befehle: `npm run pm2:restart`, `npm run pm2:logs`, `npm run pm2:stop`.

Nach einem **Node-/NVM-Upgrade** PM2-Prozess neu registrieren (alter `npm`-/`node`-Pfad wird sonst gecacht):

```bash
pm2 delete konto-planer
npm run pm2:start
pm2 save
```

### Cleanup unbestätigter Konten (Cron)

Unbestätigte Registrierungen ohne gültigen Verifizierungs-Token werden gelöscht. Empfehlung: stündlich per Cron:

```bash
0 * * * * cd /pfad/zu/konto-planer && npm run db:cleanup-unverified >> /var/log/konto-planer-cleanup.log 2>&1
```

Manuell: `npm run db:cleanup-unverified`

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

## 6. Updates deployen

```bash
git pull
npm install
npm run db:migrate
npm run build
npm run pm2:restart
```

`npm run build` führt automatisch `prisma generate` aus (Client-Typen aus dem aktuellen Schema). Nach Schema-Updates unbedingt vorher `npm run db:migrate` ausführen.

Bei Build-Problemen oder fehlenden JS-Chunks nach dem Deploy: `rm -rf .next` und `npm run build` erneut ausführen, danach PM2 neu starten.

## 7. Tests (optional)

```bash
npm test
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

Lokal prüfen: `npm run audit:check` (High/Critical müssen 0 sein).

**`npm audit fix --force` nie ausführen** — downgraded Prisma, Next oder ESLint und bricht den Stack.

### npm overrides (transitive Abhängigkeiten)

| Override | Grund | Betroffener Pfad |
|----------|-------|------------------|
| `mariadb@^3.5.4` | SSL/Credential-CVEs im DB-Treiber | Runtime: `@prisma/adapter-mariadb` → App |
| `mysql2@^3.24.3` | Auth-Plugin-Downgrade (Prisma-CLI) | Dev/Deploy: `prisma migrate` |
| `sharp@^0.35.0` | libvips-CVEs | Next.js Build / Image-Opt |
| `deepmerge-ts@^8.0.0` | Stack-Exhaustion | Prisma-CLI |
| `nanoid@^3.3.18` | Generator-Loop | Next.js |
| `find-my-way`, `valibot` | Prisma-Dev-CLI | Nur Entwicklung |
| `brace-expansion@^5.0.8` | ReDoS | ESLint-Plugins |

Bei `@prisma/adapter-mariadb`-Updates prüfen, ob Prisma den `mariadb`-Treiber offiziell anhebt — dann Override ggf. entfernen.

### DB-Sicherheit

- Die App lauscht nur auf `127.0.0.1:3001` (nicht öffentlich).
- Datenbank idealerweise auf `localhost`; bei Remote-DB TLS mit verifizierter CA nutzen, nicht nur `ssl=true` ohne Zertifikatsprüfung.

## Fehlersuche

| Problem | Hinweis |
|---------|---------|
| PM2: `Cannot find module '.../v24.../bin/npm'` | Node-Version gewechselt; `pm2 delete konto-planer && npm run pm2:start && pm2 save` |
| `npm audit fix --force` bricht Abhängigkeiten | **Nicht ausführen** — downgraded Prisma/Next/ESLint. Stattdessen gezielte `overrides` in `package.json` oder `npm audit fix` ohne `--force` |
| Audit meldet `mariadb`/`mysql2` | `overrides` in `package.json` prüfen; `npm install` und `npm run audit:check` |
| Start bricht sofort ab | Pflicht-Env in Produktion prüfen (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `TRUST_PROXY`, SMTP-Variablen) |
| Keine Bestätigungs-E-Mail | SMTP-Zugangsdaten und `AUTH_URL` prüfen; Spam-Ordner |
| Login-Redirect falsch | `AUTH_URL` muss die öffentliche HTTPS-URL sein |
| `Unknown field` / Prisma-Fehler | `npm run db:migrate` und `npx prisma generate`, danach PM2 neu starten |
| Endlos-Ladebalken / Chunk-Fehler 500 | Unvollständiger Build: `rm -rf .next && npm run build && npm run pm2:restart` |
| 502 vom Proxy | App läuft? `curl -I http://127.0.0.1:3001` |

Logs bei PM2: `./logs/pm2-*.log` oder `npm run pm2:logs`.

Weitere API-Details: [API.md](API.md) · Logging: [LOGGING.md](LOGGING.md)
