#!/usr/bin/env node
/**
 * Release in einem Schritt: `npm run release -- 9.4.5`
 *
 * 1. Typecheck, Lint und Tests – bei einem Fehler Abbruch, ohne etwas zu ändern
 * 2. Version in package.json und package-lock.json setzen
 * 3. Alles committen (Nachricht = Versionsnummer) und pushen
 */
import { spawnSync } from 'node:child_process'

const version = process.argv[2]

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Aufruf: npm run release -- <Version>, z. B. npm run release -- 9.4.5')
  process.exit(1)
}

function run(command, args) {
  console.log(`\n› ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.status !== 0) {
    console.error(`\nAbgebrochen: „${command} ${args.join(' ')}“ ist fehlgeschlagen.`)
    process.exit(result.status ?? 1)
  }
}

run('npm', ['run', 'typecheck'])
run('npm', ['run', 'lint'])
run('npm', ['test'])

run('npm', ['version', version, '--no-git-tag-version'])
run('git', ['add', '.'])
run('git', ['commit', '-m', version])
run('git', ['push'])

console.log(`\nVersion ${version} ist committet und gepusht.`)
