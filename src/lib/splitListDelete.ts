import { prisma } from '@/lib/prisma'

/**
 * Löscht eine Split-Liste inkl. aller abhängigen Daten (Reihenfolge wegen RESTRICT-FKs).
 */
export async function deleteSplitListCascade(splitListId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.splitExpense.deleteMany({ where: { splitListId } })
    await tx.splitSettlement.deleteMany({ where: { splitListId } })
    await tx.splitListInvite.deleteMany({ where: { splitListId } })
    await tx.splitParticipant.deleteMany({ where: { splitListId } })
    await tx.splitCategory.deleteMany({ where: { splitListId } })
    await tx.splitListMember.deleteMany({ where: { splitListId } })
    await tx.splitList.delete({ where: { id: splitListId } })
  })
}
