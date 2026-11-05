import type { User } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getBankById } from '@/lib/germanBanks'
import { getEffectivePlan, PLAN_LABELS, type PlanSourceId } from '@/lib/plans'
import { getRecurringIntervalLabel } from '@/lib/recurringIntervals'
import { RECURRING_AUTO_MODE_OPTIONS } from '@/lib/recurringAutoMode'
import { splitAmountEqually } from '@/lib/splitBalances'
import {
  loadCategoryLookup,
  lookupTransactionCategory,
  lookupTransactionMerchantName,
} from '@/lib/categoryLookup'

/**
 * Datenexport nach DSGVO (Auskunft Art. 15, Übertragbarkeit Art. 20).
 *
 * Alle Datenschutz-Filter sitzen hier:
 * - eigene Konten (Inhaber) vollständig, geteilte Konten nur als Mitgliedschaft
 * - Split-Listen nur mit Ausgaben und Ausgleichen, an denen der Nutzer beteiligt ist
 * - keine Namen oder E-Mail-Adressen anderer Personen
 * - keine Sicherheitsdaten (Passwort-Hash, Tokens) und keine internen IDs
 */

export const DATA_EXPORT_VERSION = '1.0'

/** Platzhalter für andere Personen in Split-Listen */
export const OTHER_PERSON = 'andere Person'
const YOU = 'du'

export type ExportTransaction = {
  date: string
  merchant: string
  description: string | null
  amount: number
  category: string | null
  confirmed: boolean
  /** Vorlage einer wiederkehrenden Zahlung */
  recurringTemplate: boolean
  recurringInterval: string | null
  recurringPaused: boolean
  /** Aus einer wiederkehrenden Zahlung entstanden */
  fromRecurring: boolean
  transfer: boolean
  transferTarget: string | null
  createdAt: string
}

export type ExportOwnAccount = {
  name: string
  bank: string | null
  type: string
  salaryDay: number
  recurringAutoMode: string
  transferSenderName: string | null
  otherMembers: number
  createdAt: string
  categories: { name: string; color: string | null }[]
  merchants: { name: string; categories: string[] }[]
  transactions: ExportTransaction[]
}

export type ExportSplitExpense = {
  list: string
  date: string
  description: string
  category: string | null
  amount: number
  originalAmount: number | null
  originalCurrency: string | null
  exchangeRate: number | null
  paidBy: string
  participants: number
  yourShare: number
}

export type ExportSplitSettlement = {
  list: string
  date: string
  from: string
  to: string
  amount: number
  note: string | null
}

export type ExportSplitList = {
  name: string
  description: string | null
  role: string
  status: string
  memberSince: string
  yourName: string | null
  currencies: string[]
  /** Nur bei eigenen Listen */
  publicLinkActive: boolean | null
  expenses: ExportSplitExpense[]
  settlements: ExportSplitSettlement[]
}

export type UserDataExport = {
  version: string
  createdAt: string
  user: {
    email: string
    registeredAt: string
    emailVerifiedAt: string | null
    pendingEmail: string | null
    splitDisplayName: string | null
    lastLoginAt: string | null
    isAdmin: boolean
    keptAccount: string | null
    recurringIntroSeenAt: string | null
  }
  plan: {
    current: string
    stored: string
    source: string | null
    expiresAt: string | null
    subscriptionStatus: string | null
    subscriptionInterval: string | null
    cancelAtPeriodEnd: boolean
    stripeCustomer: boolean
  }
  planChanges: {
    date: string
    from: string
    to: string
    source: string
    expiresAt: string | null
    changedBy: string
    note: string | null
  }[]
  ownAccounts: ExportOwnAccount[]
  sharedAccounts: { name: string; role: string; memberSince: string }[]
  invitationsSent: { date: string; kind: string; name: string; role: string | null; status: string }[]
  invitationsReceived: { date: string; kind: string; name: string; role: string | null }[]
  splitLists: ExportSplitList[]
}

export const PLAN_SOURCE_LABELS: Record<PlanSourceId, string> = {
  LEGACY: 'Bestand',
  TRIAL: 'Testphase',
  MANUAL: 'von Hand',
  STRIPE: 'Abo',
}

const ACCOUNT_ROLE_LABELS: Record<string, string> = {
  OWNER: 'Inhaber',
  MEMBER: 'Mitglied',
  READ_ONLY: 'Nur lesen',
}

const SPLIT_ROLE_LABELS: Record<string, string> = {
  OWNER: 'Ersteller',
  MEMBER: 'Mitglied',
}

const INVITE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'offen',
  ACCEPTED: 'angenommen',
  REVOKED: 'zurückgezogen',
}

/** Abo-Status von Stripe auf Deutsch; Unbekanntes bleibt wie geliefert */
const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: 'aktiv',
  trialing: 'Testzeitraum',
  past_due: 'Zahlung offen',
  unpaid: 'unbezahlt',
  canceled: 'beendet',
  incomplete: 'unvollständig',
  incomplete_expired: 'abgelaufen',
  paused: 'pausiert',
}

const INTERVAL_LABELS: Record<string, string> = {
  MONTHLY: 'monatlich',
  YEARLY: 'jährlich',
}

const iso = (date: Date) => date.toISOString()
const isoOrNull = (date: Date | null | undefined) => (date ? date.toISOString() : null)
const toNumber = (value: { toNumber(): number } | number) =>
  typeof value === 'number' ? value : value.toNumber()

export async function collectUserData(user: User, now: Date = new Date()): Promise<UserDataExport> {
  const [memberships, planChanges, accountInvitesSent, splitInvitesSent, accountInvitesReceived, splitInvitesReceived, splitMemberships] =
    await Promise.all([
      prisma.accountMember.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
        select: {
          role: true,
          createdAt: true,
          account: {
            select: {
              id: true,
              name: true,
              bankId: true,
              salaryDay: true,
              isSimpleAccount: true,
              recurringAutoMode: true,
              transferSenderName: true,
              createdAt: true,
              _count: { select: { members: true } },
            },
          },
        },
      }),
      prisma.planChange.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
        select: {
          fromPlan: true,
          toPlan: true,
          source: true,
          expiresAt: true,
          changedById: true,
          note: true,
          createdAt: true,
        },
      }),
      prisma.accountInvite.findMany({
        where: { invitedByUserId: user.id },
        orderBy: { createdAt: 'asc' },
        select: { role: true, status: true, createdAt: true, account: { select: { name: true } } },
      }),
      prisma.splitListInvite.findMany({
        where: { invitedByUserId: user.id },
        orderBy: { createdAt: 'asc' },
        select: { status: true, createdAt: true, splitList: { select: { name: true } } },
      }),
      prisma.accountInvite.findMany({
        where: { email: user.email, status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        select: { role: true, createdAt: true, account: { select: { name: true } } },
      }),
      prisma.splitListInvite.findMany({
        where: { email: user.email, status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true, splitList: { select: { name: true } } },
      }),
      prisma.splitListMember.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
        select: {
          role: true,
          createdAt: true,
          splitList: {
            select: {
              id: true,
              name: true,
              description: true,
              status: true,
              shareEnabled: true,
              currencies: { select: { currencyCode: true }, orderBy: { sortOrder: 'asc' } },
            },
          },
        },
      }),
    ])

  const owned = memberships.filter((m) => m.role === 'OWNER')
  const shared = memberships.filter((m) => m.role !== 'OWNER')
  const ownAccounts = await Promise.all(
    owned.map(async (m) => ({ ...(await collectAccount(m.account.id)), meta: m.account }))
  )
  const splitLists = await Promise.all(
    splitMemberships.map(async (m) => collectSplitList(user.id, m))
  )

  const keptAccount = user.keptAccountId
    ? memberships.find((m) => m.account.id === user.keptAccountId)?.account.name ?? null
    : null

  return {
    version: DATA_EXPORT_VERSION,
    createdAt: iso(now),
    user: {
      email: user.email,
      registeredAt: iso(user.createdAt),
      emailVerifiedAt: isoOrNull(user.emailVerified),
      pendingEmail: user.pendingEmail,
      splitDisplayName: user.splitDisplayName,
      lastLoginAt: isoOrNull(user.lastLoginAt),
      isAdmin: user.isAdmin,
      keptAccount,
      recurringIntroSeenAt: isoOrNull(user.recurringIntroSeenAt),
    },
    plan: {
      current: PLAN_LABELS[getEffectivePlan(user, now)],
      stored: PLAN_LABELS[user.plan],
      source: user.planSource ? PLAN_SOURCE_LABELS[user.planSource] : null,
      expiresAt: isoOrNull(user.planExpiresAt),
      subscriptionStatus: user.stripeSubscriptionStatus
        ? SUBSCRIPTION_STATUS_LABELS[user.stripeSubscriptionStatus] ?? user.stripeSubscriptionStatus
        : null,
      subscriptionInterval: user.planInterval ? INTERVAL_LABELS[user.planInterval] : null,
      cancelAtPeriodEnd: user.planCancelAtPeriodEnd,
      stripeCustomer: user.stripeCustomerId !== null,
    },
    planChanges: planChanges.map((c) => ({
      date: iso(c.createdAt),
      from: PLAN_LABELS[c.fromPlan],
      to: PLAN_LABELS[c.toPlan],
      source: PLAN_SOURCE_LABELS[c.source],
      expiresAt: isoOrNull(c.expiresAt),
      // Keine fremde E-Mail-Adresse: nur, ob es der Nutzer selbst, die Verwaltung oder das System war
      changedBy: c.changedById === null ? 'automatisch' : c.changedById === user.id ? 'du selbst' : 'Verwaltung',
      note: c.note,
    })),
    ownAccounts: ownAccounts.map(({ meta, ...data }) => ({
      name: meta.name,
      bank: getBankById(meta.bankId)?.name ?? null,
      type: meta.isSimpleAccount ? 'Einfaches Konto' : 'Planungskonto',
      salaryDay: meta.salaryDay,
      recurringAutoMode:
        RECURRING_AUTO_MODE_OPTIONS.find((o) => o.value === meta.recurringAutoMode)?.label ??
        meta.recurringAutoMode,
      transferSenderName: meta.transferSenderName,
      otherMembers: Math.max(0, meta._count.members - 1),
      createdAt: iso(meta.createdAt),
      ...data,
    })),
    sharedAccounts: shared.map((m) => ({
      name: m.account.name,
      role: ACCOUNT_ROLE_LABELS[m.role],
      memberSince: iso(m.createdAt),
    })),
    invitationsSent: [
      ...accountInvitesSent.map((i) => ({
        date: iso(i.createdAt),
        kind: 'Konto',
        name: i.account.name,
        role: ACCOUNT_ROLE_LABELS[i.role],
        status: INVITE_STATUS_LABELS[i.status],
      })),
      ...splitInvitesSent.map((i) => ({
        date: iso(i.createdAt),
        kind: 'Split-Liste',
        name: i.splitList.name,
        role: null,
        status: INVITE_STATUS_LABELS[i.status],
      })),
    ],
    invitationsReceived: [
      ...accountInvitesReceived.map((i) => ({
        date: iso(i.createdAt),
        kind: 'Konto',
        name: i.account.name,
        role: ACCOUNT_ROLE_LABELS[i.role],
      })),
      ...splitInvitesReceived.map((i) => ({
        date: iso(i.createdAt),
        kind: 'Split-Liste',
        name: i.splitList.name,
        role: null,
      })),
    ],
    splitLists,
  }
}

/** Kategorien, Händler und Buchungen eines eigenen Kontos */
async function collectAccount(accountId: string) {
  const [lookup, transactions] = await Promise.all([
    loadCategoryLookup(accountId),
    prisma.transaction.findMany({
      where: { accountId },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      select: {
        date: true,
        merchant: true,
        merchantId: true,
        categoryId: true,
        description: true,
        amount: true,
        isConfirmed: true,
        isRecurring: true,
        isRecurringPaused: true,
        recurringInterval: true,
        parentTransactionId: true,
        isTransfer: true,
        transferTargetMerchant: true,
        createdAt: true,
      },
    }),
  ])

  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'de')

  return {
    categories: [...lookup.categoryById.values()]
      .map((c) => ({ name: c.name, color: c.color ?? null }))
      .sort(byName),
    merchants: [...lookup.merchantById.values()]
      .map((m) => ({ name: m.name, categories: m.categories.map((c) => c.name) }))
      .sort(byName),
    transactions: transactions.map(
      (t): ExportTransaction => ({
        date: iso(t.date),
        merchant: lookupTransactionMerchantName(lookup, t),
        description: t.description,
        amount: toNumber(t.amount),
        category: lookupTransactionCategory(lookup, t)?.name ?? null,
        confirmed: t.isConfirmed,
        recurringTemplate: t.isRecurring,
        recurringInterval: t.isRecurring ? getRecurringIntervalLabel(t.recurringInterval) : null,
        recurringPaused: t.isRecurring && t.isRecurringPaused,
        fromRecurring: t.parentTransactionId !== null,
        transfer: t.isTransfer,
        transferTarget: t.isTransfer ? t.transferTargetMerchant : null,
        createdAt: iso(t.createdAt),
      })
    ),
  }
}

type SplitMembership = {
  role: 'OWNER' | 'MEMBER'
  createdAt: Date
  splitList: {
    id: string
    name: string
    description: string | null
    status: 'ACTIVE' | 'ARCHIVED'
    shareEnabled: boolean
    currencies: { currencyCode: string }[]
  }
}

/** Eine Split-Liste – nur Ausgaben und Ausgleiche, an denen der Nutzer beteiligt ist */
async function collectSplitList(userId: string, membership: SplitMembership): Promise<ExportSplitList> {
  const list = membership.splitList
  const [ownParticipants, expenses, settlements] = await Promise.all([
    prisma.splitParticipant.findMany({
      where: { splitListId: list.id, userId },
      select: { id: true, displayName: true },
    }),
    prisma.splitExpense.findMany({
      where: { splitListId: list.id },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      select: {
        date: true,
        description: true,
        amount: true,
        originalAmount: true,
        originalCurrencyCode: true,
        exchangeRate: true,
        paidByParticipantId: true,
        category: { select: { name: true } },
        // Gleiche Reihenfolge wie bei den Salden, damit der Rundungsrest gleich verteilt wird
        shares: { select: { participantId: true } },
      },
    }),
    prisma.splitSettlement.findMany({
      where: { splitListId: list.id },
      orderBy: [{ settledAt: 'asc' }, { createdAt: 'asc' }],
      select: { settledAt: true, fromParticipantId: true, toParticipantId: true, amount: true, note: true },
    }),
  ])

  const own = new Set(ownParticipants.map((p) => p.id))
  const person = (participantId: string) => (own.has(participantId) ? YOU : OTHER_PERSON)

  // Ohne ausgewählte Beteiligte gilt die Ausgabe für alle Teilnehmer
  const needsAll = expenses.some((e) => e.shares.length === 0)
  const allParticipantIds = needsAll
    ? (
        await prisma.splitParticipant.findMany({
          where: { splitListId: list.id },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: { id: true },
        })
      ).map((p) => p.id)
    : []

  const exportExpenses: ExportSplitExpense[] = []
  for (const e of expenses) {
    const amount = toNumber(e.amount)
    const shareIds = e.shares.length > 0 ? e.shares.map((s) => s.participantId) : allParticipantIds
    const portions = splitAmountEqually(amount, shareIds.length)
    const yourShare = shareIds.reduce((sum, id, i) => (own.has(id) ? sum + portions[i] : sum), 0)
    const paidByYou = own.has(e.paidByParticipantId)
    const involved = paidByYou || shareIds.some((id) => own.has(id))
    if (!involved) continue

    exportExpenses.push({
      list: list.name,
      date: iso(e.date),
      description: e.description,
      category: e.category?.name ?? null,
      amount,
      originalAmount: e.originalAmount ? toNumber(e.originalAmount) : null,
      originalCurrency: e.originalCurrencyCode,
      exchangeRate: e.exchangeRate ? toNumber(e.exchangeRate) : null,
      paidBy: person(e.paidByParticipantId),
      participants: shareIds.length,
      yourShare: Math.round(yourShare * 100) / 100,
    })
  }

  return {
    name: list.name,
    description: list.description,
    role: SPLIT_ROLE_LABELS[membership.role],
    status: list.status === 'ARCHIVED' ? 'archiviert' : 'aktiv',
    memberSince: iso(membership.createdAt),
    yourName: ownParticipants[0]?.displayName ?? null,
    currencies: list.currencies.map((c) => c.currencyCode),
    publicLinkActive: membership.role === 'OWNER' ? list.shareEnabled : null,
    expenses: exportExpenses,
    settlements: settlements
      .filter((s) => own.has(s.fromParticipantId) || own.has(s.toParticipantId))
      .map((s) => ({
        list: list.name,
        date: iso(s.settledAt),
        from: person(s.fromParticipantId),
        to: person(s.toParticipantId),
        amount: toNumber(s.amount),
        note: s.note,
      })),
  }
}
