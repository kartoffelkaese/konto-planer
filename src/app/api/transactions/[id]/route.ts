import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

interface UpdateData {
  description?: string
  merchant?: string
  merchantId?: string
  amount?: number
  date?: string
  isConfirmed?: boolean
  isRecurring?: boolean
  recurringInterval?: string | null
  lastConfirmedDate?: string | null
}

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
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(context.params)
  console.log('PATCH Route aufgerufen mit ID:', resolvedParams.id)
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    console.log('Keine Benutzer-Session gefunden')
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      console.log('Benutzer nicht gefunden für Email:', session.user.email)
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    console.log('Benutzer gefunden:', user.id)

    // Überprüfe, ob die Transaktion existiert und dem Benutzer gehört
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: resolvedParams.id,
        userId: user.id
      }
    })

    if (!existingTransaction) {
      console.log('Transaktion nicht gefunden für ID:', resolvedParams.id)
      return NextResponse.json({ error: 'Transaktion nicht gefunden' }, { status: 404 })
    }

    console.log('Bestehende Transaktion gefunden:', existingTransaction.id)

    const updateData = await request.json()
    console.log('Update-Daten erhalten:', updateData)

    // Nur die erlaubten Felder für das Update extrahieren
    const allowedUpdateFields = {
      description: updateData.description,
      merchant: updateData.merchant,
      merchantId: updateData.merchantId,
      amount: updateData.amount,
      date: updateData.date ? new Date(updateData.date) : undefined,
      isConfirmed: updateData.isConfirmed,
      isRecurring: updateData.isRecurring,
      recurringInterval: updateData.recurringInterval,
      lastConfirmedDate: updateData.lastConfirmedDate ? new Date(updateData.lastConfirmedDate) : null
    }

    // Entferne undefined Werte
    const cleanedUpdateFields = Object.fromEntries(
      Object.entries(allowedUpdateFields).filter(([_, value]) => value !== undefined)
    )
    console.log('Bereinigte Update-Felder:', cleanedUpdateFields)

    const updatedTransaction = await prisma.transaction.update({
      where: { id: resolvedParams.id },
      data: cleanedUpdateFields,
      include: {
        merchantRef: {
          include: {
            category: true
          }
        }
      }
    })

    console.log('Transaktion erfolgreich aktualisiert:', updatedTransaction.id)
    return NextResponse.json(updatedTransaction)
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Transaktion:', error)
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