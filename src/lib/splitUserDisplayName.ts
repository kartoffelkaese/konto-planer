import { prisma } from '@/lib/prisma'
import { getFirstAccountIdForUser } from '@/lib/accounts'
import { resolveTransferSenderName } from '@/lib/transfers'

/**
 * Anzeigename für Split-Teilnehmer mit konto-planer-Konto.
 * Nutzt den benutzerweiten Split-Namen; sonst Absendername/Kontobezeichnung
 * des ersten Kontos (nicht des aktiven Kontos).
 */
export async function getSplitDisplayNameForUser(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { splitDisplayName: true },
  })

  const splitName = user?.splitDisplayName?.trim()
  if (splitName) {
    return splitName
  }

  const accountId = await getFirstAccountIdForUser(userId)
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
