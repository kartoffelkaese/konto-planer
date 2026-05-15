import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'

export async function GET(_request: NextRequest) {
  try {
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult

    const { user } = authResult

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        isRecurring: true,
      },
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching recurring transactions:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der wiederkehrenden Transaktionen' },
      { status: 500 }
    )
  }
}
