/**
 * Legt das Demo-Konto demo@demo / demo an (idempotent).
 * Drei Konten: Haushalt (Planung), Sparkonto (Umbuchungen), Alltag (einfaches Konto).
 *
 * Ausführen: npm run db:seed-demo
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient, AccountMemberRole } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const DEMO_EMAIL = 'demo@demo'
const DEMO_PASSWORD = 'demo'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL ist nicht gesetzt.')
  process.exit(1)
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(databaseUrl),
})

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(12, 0, 0, 0)
  return d
}

function monthsAgo(n, day = 1) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  d.setDate(day)
  d.setHours(12, 0, 0, 0)
  return d
}

function invertAmount(amount) {
  return -Number(amount)
}

async function createTransferPair(tx, sourceTransaction, targetAccountId, targetIncomingMerchant) {
  const source = await tx.transaction.findUniqueOrThrow({
    where: { id: sourceTransaction.id },
    select: {
      description: true,
      amount: true,
      date: true,
      isConfirmed: true,
    },
  })

  const targetTransaction = await tx.transaction.create({
    data: {
      accountId: targetAccountId,
      merchant: targetIncomingMerchant,
      description: source.description,
      amount: invertAmount(source.amount),
      date: source.date,
      isConfirmed: source.isConfirmed,
      isRecurring: false,
    },
  })

  await tx.transferPair.create({
    data: {
      sourceTransactionId: sourceTransaction.id,
      targetTransactionId: targetTransaction.id,
      targetAccountId,
    },
  })

  await tx.transaction.update({
    where: { id: sourceTransaction.id },
    data: {
      isTransfer: true,
      transferTargetAccountId: targetAccountId,
    },
  })

  return targetTransaction
}

async function createAccountWithOwner(tx, userId, { name, salaryDay, isSimpleAccount = false }) {
  const account = await tx.account.create({
    data: { name, salaryDay, isSimpleAccount },
  })
  await tx.accountMember.create({
    data: {
      accountId: account.id,
      userId,
      role: AccountMemberRole.OWNER,
    },
  })
  return account
}

async function createCategory(tx, accountId, name, color) {
  return tx.category.create({
    data: { accountId, name, color },
  })
}

async function createMerchant(tx, accountId, name, categoryId) {
  const merchant = await tx.merchant.create({
    data: { accountId, name },
  })
  await tx.merchantCategory.create({
    data: { merchantId: merchant.id, categoryId },
  })
  return merchant
}

async function createTransaction(tx, data) {
  return tx.transaction.create({ data })
}

async function removeDemoUser() {
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    include: { memberships: { select: { accountId: true } } },
  })
  if (!existing) return

  const accountIds = [...new Set(existing.memberships.map((m) => m.accountId))]
  if (accountIds.length > 0) {
    await prisma.account.deleteMany({ where: { id: { in: accountIds } } })
  }
  await prisma.user.delete({ where: { id: existing.id } })
  console.log('Vorhandenes Demo-Konto entfernt.')
}

async function main() {
  await removeDemoUser()

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, await bcrypt.genSalt(10))

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email: DEMO_EMAIL, passwordHash },
    })

    const haushalt = await createAccountWithOwner(tx, user.id, {
      name: 'Haushaltskonto',
      salaryDay: 15,
    })
    const sparkonto = await createAccountWithOwner(tx, user.id, {
      name: 'Sparkonto',
      salaryDay: 1,
    })
    const alltag = await createAccountWithOwner(tx, user.id, {
      name: 'Alltag',
      salaryDay: 1,
      isSimpleAccount: true,
    })

    const catIncome = await createCategory(tx, haushalt.id, 'Einkommen', '#236b44')
    const catHousing = await createCategory(tx, haushalt.id, 'Wohnen', '#2E86AB')
    const catFood = await createCategory(tx, haushalt.id, 'Lebensmittel', '#C0392B')
    const catLeisure = await createCategory(tx, haushalt.id, 'Freizeit', '#6B4C9A')
    const catMobility = await createCategory(tx, haushalt.id, 'Mobilität', '#D35400')
    const catTransfer = await createCategory(tx, haushalt.id, 'Umbuchung', '#566573')

    const merchantEmployer = await createMerchant(tx, haushalt.id, 'Arbeitgeber GmbH', catIncome.id)
    const merchantLandlord = await createMerchant(tx, haushalt.id, 'Vermieter', catHousing.id)
    const merchantUtility = await createMerchant(tx, haushalt.id, 'Stadtwerke', catHousing.id)
    const merchantNetflix = await createMerchant(tx, haushalt.id, 'Netflix', catLeisure.id)
    const merchantRewe = await createMerchant(tx, haushalt.id, 'REWE', catFood.id)
    const merchantAldi = await createMerchant(tx, haushalt.id, 'Aldi', catFood.id)
    const merchantShell = await createMerchant(tx, haushalt.id, 'Shell', catMobility.id)

    // Wiederkehrende Vorlagen (Haushaltskonto)
    const recurringSalary = await createTransaction(tx, {
      accountId: haushalt.id,
      merchant: merchantEmployer.name,
      merchantId: merchantEmployer.id,
      categoryId: catIncome.id,
      amount: 3200,
      date: monthsAgo(12, 15),
      isRecurring: true,
      recurringInterval: 'monthly',
      isConfirmed: true,
      lastConfirmedDate: monthsAgo(1, 15),
    })

    const recurringRent = await createTransaction(tx, {
      accountId: haushalt.id,
      merchant: merchantLandlord.name,
      merchantId: merchantLandlord.id,
      categoryId: catHousing.id,
      amount: -980,
      date: monthsAgo(12, 3),
      isRecurring: true,
      recurringInterval: 'monthly',
      isConfirmed: true,
      lastConfirmedDate: monthsAgo(1, 3),
    })

    await createTransaction(tx, {
      accountId: haushalt.id,
      merchant: merchantUtility.name,
      merchantId: merchantUtility.id,
      categoryId: catHousing.id,
      amount: -95,
      date: monthsAgo(6, 10),
      isRecurring: true,
      recurringInterval: 'monthly',
      isConfirmed: false,
    })

    await createTransaction(tx, {
      accountId: haushalt.id,
      merchant: merchantNetflix.name,
      merchantId: merchantNetflix.id,
      categoryId: catLeisure.id,
      amount: -12.99,
      date: monthsAgo(8, 18),
      isRecurring: true,
      recurringInterval: 'monthly',
      isConfirmed: false,
    })

    const recurringSavings = await createTransaction(tx, {
      accountId: haushalt.id,
      merchant: 'Sparkonto',
      categoryId: catTransfer.id,
      amount: -250,
      date: monthsAgo(6, 16),
      isRecurring: true,
      recurringInterval: 'monthly',
      isTransfer: true,
      transferTargetAccountId: sparkonto.id,
      isConfirmed: false,
    })

    // Bestätigte Instanzen der wiederkehrenden Gehaltszahlung
    for (const monthsBack of [3, 2, 1]) {
      await createTransaction(tx, {
        accountId: haushalt.id,
        parentTransactionId: recurringSalary.id,
        merchant: merchantEmployer.name,
        merchantId: merchantEmployer.id,
        categoryId: catIncome.id,
        amount: 3200,
        date: monthsAgo(monthsBack, 15),
        isConfirmed: true,
        isRecurring: false,
      })
    }

    for (const monthsBack of [3, 2, 1]) {
      await createTransaction(tx, {
        accountId: haushalt.id,
        parentTransactionId: recurringRent.id,
        merchant: merchantLandlord.name,
        merchantId: merchantLandlord.id,
        categoryId: catHousing.id,
        amount: -980,
        date: monthsAgo(monthsBack, 3),
        isConfirmed: true,
        isRecurring: false,
      })
    }

    // Einzelbuchungen Haushaltskonto
    const haushaltTx = [
      { merchant: merchantRewe, categoryId: catFood.id, amount: -54.32, days: 4, confirmed: true },
      { merchant: merchantAldi, categoryId: catFood.id, amount: -28.9, days: 9, confirmed: true },
      { merchant: merchantShell, categoryId: catMobility.id, amount: -72.4, days: 12, confirmed: true },
      { merchant: merchantRewe, categoryId: catFood.id, amount: -41.15, days: 18, confirmed: true },
      { merchant: merchantAldi, categoryId: catFood.id, amount: -36.5, days: 25, confirmed: false },
      {
        merchantName: 'Restaurant Zur Linde',
        categoryId: catLeisure.id,
        amount: -68.5,
        days: 7,
        confirmed: true,
      },
      {
        merchantName: 'Amazon',
        categoryId: catLeisure.id,
        amount: -34.99,
        days: 15,
        confirmed: true,
      },
    ]

    for (const row of haushaltTx) {
      await createTransaction(tx, {
        accountId: haushalt.id,
        merchant: row.merchant?.name ?? row.merchantName,
        merchantId: row.merchant?.id ?? null,
        categoryId: row.categoryId,
        amount: row.amount,
        date: daysAgo(row.days),
        isConfirmed: row.confirmed,
        isRecurring: false,
      })
    }

    // Umbuchungen Haushalt → Sparkonto
    const transferRows = [
      { amount: -500, days: 20, description: 'Sparrate März', confirmed: true },
      { amount: -250, days: 5, description: 'Monatliche Sparrate', confirmed: true },
    ]

    for (const row of transferRows) {
      const source = await createTransaction(tx, {
        accountId: haushalt.id,
        merchant: 'Sparkonto',
        description: row.description,
        categoryId: catTransfer.id,
        amount: row.amount,
        date: daysAgo(row.days),
        isConfirmed: row.confirmed,
        isRecurring: false,
        isTransfer: true,
        transferTargetAccountId: sparkonto.id,
      })
      await createTransferPair(tx, source, sparkonto.id, haushalt.name)
    }

    // Instanz der wiederkehrenden Sparrate (mit Gegenbuchung)
    const savingsInstance = await createTransaction(tx, {
      accountId: haushalt.id,
      parentTransactionId: recurringSavings.id,
      merchant: 'Sparkonto',
      categoryId: catTransfer.id,
      amount: -250,
      date: monthsAgo(1, 16),
      isConfirmed: true,
      isRecurring: false,
      isTransfer: true,
      transferTargetAccountId: sparkonto.id,
    })
    await createTransferPair(tx, savingsInstance, sparkonto.id, haushalt.name)

    // Sparkonto: Zinsen + kleine Buchung
    await createTransaction(tx, {
      accountId: sparkonto.id,
      merchant: 'Bank',
      description: 'Habenzinsen',
      amount: 14.85,
      date: daysAgo(28),
      isConfirmed: true,
      isRecurring: false,
    })

    await createTransaction(tx, {
      accountId: sparkonto.id,
      merchant: 'Notgroschen',
      description: 'Rücklage',
      amount: -100,
      date: daysAgo(45),
      isConfirmed: true,
      isRecurring: false,
    })

    // Einfaches Konto: nur Einzelbuchungen
    const simpleTx = [
      { merchant: 'Bäckerei Müller', amount: -4.5, days: 1 },
      { merchant: 'Supermarkt', amount: -23.8, days: 3 },
      { merchant: 'Café Central', amount: -6.9, days: 6 },
      { merchant: 'Tankstelle', amount: -58.2, days: 11 },
      { merchant: 'Gehalt', amount: 1800, days: 14 },
      { merchant: 'Apotheke', amount: -18.4, days: 19 },
    ]

    for (const row of simpleTx) {
      await createTransaction(tx, {
        accountId: alltag.id,
        merchant: row.merchant,
        amount: row.amount,
        date: daysAgo(row.days),
        isConfirmed: true,
        isRecurring: false,
      })
    }

  }, {
    maxWait: 10_000,
    timeout: 60_000,
  })

  console.log('Demo-Konto erstellt:')
  console.log(`  Login:    ${DEMO_EMAIL}`)
  console.log(`  Passwort: ${DEMO_PASSWORD}`)
  console.log('  Konten:')
  console.log('    - Haushaltskonto (Planung, wiederkehrende Zahlungen)')
  console.log('    - Sparkonto (Umbuchungen vom Haushaltskonto)')
  console.log('    - Alltag (einfaches Konto)')
}

main()
  .catch((err) => {
    console.error('Fehler beim Anlegen des Demo-Kontos:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
