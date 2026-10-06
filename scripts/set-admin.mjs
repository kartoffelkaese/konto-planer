#!/usr/bin/env node
/**
 * Vergibt oder entzieht das Admin-Recht (Zugang zur Verwaltung der Benutzerlevel).
 *
 * Ausführen: npm run set-admin nutzer@beispiel.de
 * Entziehen: npm run set-admin nutzer@beispiel.de --remove
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const args = process.argv.slice(2)
const remove = args.includes('--remove')
const email = args.find((arg) => !arg.startsWith('--'))?.trim().toLowerCase()

if (!email) {
  console.error('Aufruf: npm run set-admin <E-Mail> [--remove]')
  process.exit(1)
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL ist nicht gesetzt.')
  process.exit(1)
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(databaseUrl),
})

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isAdmin: true },
  })

  if (!user) {
    console.error(`Kein Nutzer mit der Adresse ${email} gefunden.`)
    process.exitCode = 1
    return
  }

  const isAdmin = !remove
  if (user.isAdmin === isAdmin) {
    console.log(`${email} ${isAdmin ? 'ist bereits Admin' : 'ist kein Admin'} – nichts geändert.`)
    return
  }

  await prisma.user.update({ where: { id: user.id }, data: { isAdmin } })
  console.log(`${email} ${isAdmin ? 'ist jetzt Admin' : 'ist kein Admin mehr'}.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
