import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params)
  
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: resolvedParams.id }
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Update transaction body:', body)

    // Formatiere die Daten
    const updateData = {
      ...body,
      date: body.date ? new Date(body.date) : undefined,
      lastConfirmedDate: body.lastConfirmedDate ? new Date(body.lastConfirmedDate) : null
    }
    console.log('Update data:', updateData)

    // Aktualisiere die Transaktion
    const updatedTransaction = await prisma.transaction.update({
      where: { id: resolvedParams.id },
      data: updateData
    })
    console.log('Updated transaction:', updatedTransaction)

    // Wenn eine Instanz bestätigt wurde, aktualisiere auch die ursprüngliche wiederkehrende Transaktion
    if (updateData.isConfirmed && updateData.lastConfirmedDate && updatedTransaction.parentTransactionId) {
      await prisma.transaction.update({
        where: { id: updatedTransaction.parentTransactionId },
        data: {
          lastConfirmedDate: updateData.lastConfirmedDate
        }
      })
    }

    return NextResponse.json(updatedTransaction)
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Transaktion' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params)
  
  try {
    await prisma.transaction.delete({
      where: { id: resolvedParams.id }
    })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 