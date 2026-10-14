import { AccountMemberRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { cancelSubscriptionsNow } from '@/lib/billing'

/**
 * Löscht einen Nutzer mit allem, was nur ihm gehört: Konten ohne weitere Mitglieder (samt
 * Buchungen, Kategorien, Händlern), seine Split-Listen, Einladungen und Tokens.
 *
 * Konten, die er mit anderen teilt, bleiben für diese erhalten; war er der einzige Inhaber,
 * wird das am längsten beteiligte Mitglied Inhaber.
 *
 * Ein laufendes Stripe-Abo wird vorher sofort beendet. Gelingt das nicht, wird nicht gelöscht –
 * sonst würde ohne Nutzer weiter abgebucht.
 */
export async function deleteUserWithData(userId: string): Promise<void> {
  const billing = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  })
  if (billing?.stripeCustomerId && process.env.STRIPE_SECRET_KEY) {
    await cancelSubscriptionsNow(billing.stripeCustomerId)
  }

  await prisma.$transaction(async (tx) => {
    const memberships = await tx.accountMember.findMany({
      where: { userId },
      include: {
        account: {
          include: { members: true },
        },
      },
    })

    for (const membership of memberships) {
      const { account } = membership
      const otherMembers = account.members.filter((m) => m.userId !== userId)

      if (otherMembers.length === 0) {
        await tx.account.delete({ where: { id: account.id } })
        continue
      }

      if (membership.role === AccountMemberRole.OWNER) {
        const ownerCount = account.members.filter(
          (m) => m.role === AccountMemberRole.OWNER
        ).length
        if (ownerCount === 1) {
          const next = otherMembers.sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
          )[0]
          await tx.accountMember.update({
            where: { id: next.id },
            data: { role: AccountMemberRole.OWNER },
          })
        }
      }
    }

    await tx.user.delete({
      where: { id: userId },
    })
  })
}
