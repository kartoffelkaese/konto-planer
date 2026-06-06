import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { syncTransferPair } from '@/lib/transfers'

/** Aktualisiert unbestätigte Instanzen, wenn sich der Vorlagenbetrag ändert. */
export async function syncUnconfirmedRecurringInstanceAmounts(
  templateId: string,
  newAmount: number | Prisma.Decimal
) {
  const instances = await prisma.transaction.findMany({
    where: {
      parentTransactionId: templateId,
      isRecurring: false,
      isConfirmed: false,
    },
    select: { id: true, isTransfer: true },
  })

  if (instances.length === 0) return

  await prisma.transaction.updateMany({
    where: {
      id: { in: instances.map((i) => i.id) },
    },
    data: { amount: newAmount },
  })

  for (const instance of instances) {
    if (instance.isTransfer) {
      await syncTransferPair(instance.id, { amount: Number(newAmount) })
    }
  }
}
