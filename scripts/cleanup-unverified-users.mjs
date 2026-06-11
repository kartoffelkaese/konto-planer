/**
 * Löscht unbestätigte Nutzer ohne gültigen Verifizierungs-Token.
 * Cron-Empfehlung: stündlich (siehe INSTALL.md)
 *
 * Ausführen: npm run db:cleanup-unverified
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL ist nicht gesetzt.')
  process.exit(1)
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(databaseUrl),
})

async function hasValidVerificationToken(userId) {
  const token = await prisma.emailVerificationToken.findFirst({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  })
  return token !== null
}

async function main() {
  let deletedUsers = 0
  let deletedAccounts = 0

  const candidates = await prisma.user.findMany({
    where: { emailVerified: null },
    select: { id: true },
  })

  for (const { id: userId } of candidates) {
    const hasValid = await hasValidVerificationToken(userId)
    if (hasValid) continue

    const memberships = await prisma.accountMember.findMany({
      where: { userId },
      select: { accountId: true },
    })

    await prisma.$transaction(async (tx) => {
      for (const { accountId } of memberships) {
        const memberCount = await tx.accountMember.count({
          where: { accountId },
        })
        if (memberCount === 1) {
          await tx.account.delete({ where: { id: accountId } })
          deletedAccounts += 1
        }
      }
      await tx.user.delete({ where: { id: userId } })
      deletedUsers += 1
    })
  }

  const expired = await prisma.emailVerificationToken.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  })

  console.log(
    `Cleanup abgeschlossen: ${deletedUsers} Nutzer, ${deletedAccounts} Konten gelöscht, ${expired.count} abgelaufene Tokens entfernt.`
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
