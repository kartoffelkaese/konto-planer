import fs from 'node:fs'

const schemaPath = 'prisma/schema.prisma'
const clientTypesPath = 'node_modules/.prisma/client/index.d.ts'

if (!fs.existsSync(schemaPath)) {
  console.error(`FEHLER: ${schemaPath} fehlt.`)
  process.exit(1)
}

if (!fs.existsSync(clientTypesPath)) {
  console.error(
    'FEHLER: Prisma Client wurde nicht generiert. Bitte zuerst `npx prisma generate` ausführen.'
  )
  process.exit(1)
}

const schema = fs.readFileSync(schemaPath, 'utf8')
const clientTypes = fs.readFileSync(clientTypesPath, 'utf8')

if (!schema.includes('model SplitListCurrency')) {
  console.error(
    'FEHLER: prisma/schema.prisma ist veraltet (SplitListCurrency fehlt).'
  )
  console.error('Bitte `git pull` ausführen und danach erneut `npm run build`.')
  process.exit(1)
}

if (!clientTypes.includes('splitListCurrency')) {
  console.error(
    'FEHLER: Der generierte Prisma Client kennt splitListCurrency nicht.'
  )
  console.error(
    'Schema und Client passen nicht zusammen. Bitte `npx prisma generate` und danach erneut `npm run build`.'
  )
  process.exit(1)
}
