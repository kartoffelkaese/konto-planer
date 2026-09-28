#!/usr/bin/env node
/**
 * PM2-Einstiegspunkt: startet die Next.js-CLI direkt (ohne npm, siehe ecosystem.config.js).
 *
 * Liegt bewusst im Projekt: PM2 ermittelt die angezeigte Version aus der nächsten
 * package.json oberhalb des Skripts. Beim direkten Start von node_modules/next/…
 * zeigte PM2 sonst die Next.js-Version statt der App-Version an.
 *
 * Argumente (z. B. `start -H 127.0.0.1 -p 3001`) kommen unverändert über process.argv.
 */
require('next/dist/bin/next')
