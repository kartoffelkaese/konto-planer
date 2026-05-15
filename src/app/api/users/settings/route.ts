import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getUserBySession,
  isErrorResponse,
  USER_PUBLIC_SELECT,
  validateSalaryDay,
  validateAccountName,
} from '@/lib/api-auth'

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult

    const { user, email } = authResult
    const body = await request.json()

    const data: { salaryDay?: number; accountName?: string | null } = {}

    if (body.salaryDay !== undefined) {
      const salaryDay = validateSalaryDay(body.salaryDay)
      if (isErrorResponse(salaryDay)) return salaryDay
      data.salaryDay = salaryDay
    }

    if (body.accountName !== undefined) {
      const accountName = validateAccountName(body.accountName)
      if (isErrorResponse(accountName)) return accountName
      data.accountName = accountName
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data,
      select: USER_PUBLIC_SELECT,
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user settings:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult

    const { email } = authResult

    const user = await prisma.user.findUnique({
      where: { email },
      select: USER_PUBLIC_SELECT,
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
