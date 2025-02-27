import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

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
  const resolvedParams = await Promise.resolve(params)
  
  try {
    const body = await request.json()
    console.log('Update transaction body:', body)
    
    // Konvertiere das Datum in ein Date-Objekt
    const updateData = {
      ...body,
      date: body.date ? new Date(body.date) : undefined,
      lastConfirmedDate: body.lastConfirmedDate ? new Date(body.lastConfirmedDate) : null,
      // Stelle sicher, dass amount als Decimal gespeichert wird
      amount: typeof body.amount === 'number' ? body.amount : parseFloat(body.amount)
    }

    // Entferne undefined Werte
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    )

    console.log('Update data:', updateData)

    const transaction = await prisma.transaction.update({
      where: { id: resolvedParams.id },
      data: updateData
    })

    console.log('Updated transaction:', transaction)
    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error updating transaction:', error)
    // Detailliertere Fehlermeldung
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
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