import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Starte Transaktion für atomare Operation
    await prisma.$transaction(async (tx) => {
      // Lösche alle Daten des Benutzers
      await tx.transaction.deleteMany({
        where: { userId: session.user.id }
      })
      await tx.merchant.deleteMany({
        where: { userId: session.user.id }
      })
      await tx.category.deleteMany({
        where: { userId: session.user.id }
      })
      await tx.user.delete({
        where: { id: session.user.id }
      })
    })

    return NextResponse.json({ message: 'Konto erfolgreich gelöscht' })
  } catch (error) {
    console.error('Fehler beim Löschen des Kontos:', error)
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 })
  }
} 