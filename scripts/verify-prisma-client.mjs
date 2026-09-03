import { execSync } from 'node:child_process'
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

if (!clientTypes.includes('get splitListCurrency()')) {
  console.error(
    'FEHLER: Der generierte Prisma Client enthält kein splitListCurrency-Delegate.'
  )
  console.error(
    'Bitte `rm -rf prisma/node_modules node_modules/.prisma && npx prisma generate` ausführen.'
  )
  process.exit(1)
}

if (fs.existsSync('prisma/node_modules/.prisma/client')) {
  console.error(
    'FEHLER: Veralteter Prisma Client in prisma/node_modules gefunden.'
  )
  console.error('Bitte `rm -rf prisma/node_modules` ausführen und erneut bauen.')
  process.exit(1)
}

try {
  execSync('node node_modules/typescript-7/bin/tsc --noEmit -p tsconfig.prisma.json', {
    stdio: 'pipe',
  })
} catch (error) {
  const output = [
    error?.stdout?.toString(),
    error?.stderr?.toString(),
  ]
    .filter(Boolean)
    .join('\n')

  console.error('FEHLER: TypeScript erkennt den generierten Prisma Client nicht.')
  if (output) {
    console.error(output)
  }
  console.error(
    'Bitte `rm -rf prisma/node_modules node_modules/.prisma tsconfig.tsbuildinfo && npm install && npm run build` ausführen.'
  )
  process.exit(1)
}
