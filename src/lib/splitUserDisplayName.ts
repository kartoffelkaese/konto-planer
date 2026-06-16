import { prisma } from '@/lib/prisma'
import { getFirstAccountIdForUser } from '@/lib/accounts'
import { resolveTransferSenderName } from '@/lib/transfers'

/**
 * Anzeigename für Split-Teilnehmer mit konto-planer-Konto:
 * transferSenderName aus Einstellungen, sonst Kontobezeichnung (Account.name).
 */
export async function getSplitDisplayNameForUser(
  userId: string,
  preferredAccountId?: string | null
): Promise<string> {
  let accountId = preferredAccountId ?? null
  if (!accountId) {
    accountId = await getFirstAccountIdForUser(userId)
  }
  if (!accountId) {
    return 'Teilnehmer'
  }

  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      members: { some: { userId } },
    },
    select: { name: true, transferSenderName: true },
  })

  if (!account) {
    return 'Teilnehmer'
  }

  return resolveTransferSenderName(account)
}

/**
 * Eindeutiger Anzeigename innerhalb einer Split-Liste.
 */
export async function resolveUniqueSplitDisplayName(
  splitListId: string,
  baseName: string,
  excludeParticipantId?: string
): Promise<string> {
  const trimmed = baseName.trim()
  if (!trimmed) return 'Teilnehmer'

  const existing = await prisma.splitParticipant.findMany({
    where: {
      splitListId,
      ...(excludeParticipantId ? { NOT: { id: excludeParticipantId } } : {}),
    },
    select: { displayName: true },
  })

  return dedupeDisplayNameAgainst(
    trimmed,
    existing.map((p) => p.displayName)
  )
}

export function dedupeDisplayNameAgainst(
  baseName: string,
  taken: string[]
): string {
  const trimmed = baseName.trim()
  if (!trimmed) return 'Teilnehmer'
  if (!taken.includes(trimmed)) return trimmed

  let suffix = 2
  while (taken.includes(`${trimmed} (${suffix})`)) {
    suffix += 1
  }
  return `${trimmed} (${suffix})`
}

/**
 * Aktualisiert den eigenen Split-Teilnehmer-Eintrag auf den Namen aus den
 * Kontoeinstellungen (Absendername oder Kontobezeichnung des aktiven Kontos).
 */
export async function syncOwnSplitParticipantInList(
  userId: string,
  splitListId: string,
  preferredAccountId?: string | null
): Promise<void> {
  const ownParticipants = await prisma.splitParticipant.findMany({
    where: { splitListId, userId },
  })

  if (ownParticipants.length === 0) return

  const settingsName = await getSplitDisplayNameForUser(userId, preferredAccountId)

  for (const participant of ownParticipants) {
    const uniqueName = await resolveUniqueSplitDisplayName(
      splitListId,
      settingsName,
      participant.id
    )

    if (participant.displayName !== uniqueName) {
      await prisma.splitParticipant.update({
        where: { id: participant.id },
        data: { displayName: uniqueName },
      })
    }
  }
}
