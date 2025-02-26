import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Später mit echter Benutzer-ID ersetzen
    const userId = 'temp-user-id'

    // Prüfe, ob der Benutzer existiert
    let user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      // Wenn kein Benutzer existiert, erstelle einen temporären Benutzer
      user = await prisma.user.create({
        data: {
          id: userId,
          email: 'temp@example.com',
          passwordHash: 'temp',
          salaryDay: body.salaryDay,
          accountName: body.accountName
        }
      })
    } else {
      // Aktualisiere den bestehenden Benutzer
      user = await prisma.user.update({
        where: { id: userId },
        data: { 
          salaryDay: body.salaryDay,
          accountName: body.accountName
        }
      })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user settings:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Später mit echter Benutzer-ID ersetzen
    const userId = 'temp-user-id'

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 