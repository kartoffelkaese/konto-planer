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

`npm run build` prüft zuerst die Typen mit TypeScript 7 (`tsc --noEmit`), danach baut Next.js die App. Dafür ist `@typescript/native-preview` als Marker nötig (TS 7 hat keine `lib/typescript.js`-API mehr).

Produktionsbetrieb mit **PM2** (empfohlen):

```bash
mkdir -p logs
npm run pm2:start
```

Weitere PM2-Befehle: `npm run pm2:restart`, `npm run pm2:logs`, `npm run pm2:stop`.

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
npx prisma generate
npm run build
npm run pm2:restart
```

Bei Build-Problemen oder fehlenden JS-Chunks nach dem Deploy: `rm -rf .next` und `npm run build` erneut ausführen, danach PM2 neu starten.

## 7. Tests (optional)

```bash
npm test
```

## Fehlersuche

| Problem | Hinweis |
|---------|---------|
| Start bricht sofort ab | Pflicht-Env in Produktion prüfen (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `TRUST_PROXY`, SMTP-Variablen) |
| Keine Bestätigungs-E-Mail | SMTP-Zugangsdaten und `AUTH_URL` prüfen; Spam-Ordner |
| Login-Redirect falsch | `AUTH_URL` muss die öffentliche HTTPS-URL sein |
| `Unknown field` / Prisma-Fehler | `npm run db:migrate` und `npx prisma generate`, danach PM2 neu starten |
| Endlos-Ladebalken / Chunk-Fehler 500 | Unvollständiger Build: `rm -rf .next && npm run build && npm run pm2:restart` |
| 502 vom Proxy | App läuft? `curl -I http://127.0.0.1:3001` |

Logs bei PM2: `./logs/pm2-*.log` oder `npm run pm2:logs`.

Weitere API-Details: [API.md](API.md) · Logging: [LOGGING.md](LOGGING.md)
