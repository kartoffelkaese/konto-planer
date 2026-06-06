import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AccountMemberRole } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getUserBySession,
  isErrorResponse,
  validateSalaryDay,
  validateAccountDisplayName,
  validateBankId,
} from '@/lib/api-auth'

export async function GET() {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const session = await auth()
  const activeAccountId = session?.activeAccountId

  const memberships = await prisma.accountMember.findMany({
    where: { userId: user.id },
    include: {
      account: {
        select: { id: true, name: true, salaryDay: true, bankId: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(
    memberships.map((m) => ({
      id: m.account.id,
      name: m.account.name,
      salaryDay: m.account.salaryDay,
      bankId: m.account.bankId,
      role: m.role,
      isActive: m.account.id === activeAccountId,
      createdAt: m.account.createdAt,
    }))
  )
}

export async function POST(request: NextRequest) {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const body = await request.json()

  const nameResult = validateAccountDisplayName(body.name ?? 'Neues Konto')
  if (isErrorResponse(nameResult)) return nameResult
  const name = nameResult ?? 'Neues Konto'

  let bankId: string | null = null
  if (body.bankId !== undefined) {
    const validatedBankId = validateBankId(body.bankId)
    if (isErrorResponse(validatedBankId)) return validatedBankId
    bankId = validatedBankId ?? null
  }

  let salaryDay = 1
  if (body.salaryDay !== undefined) {
    const validated = validateSalaryDay(body.salaryDay)
    if (isErrorResponse(validated)) return validated
    salaryDay = validated
  } else {
    const existing = await prisma.accountMember.findFirst({
      where: { userId: user.id },
      include: { account: { select: { salaryDay: true } } },
      orderBy: { createdAt: 'asc' },
    })
    if (existing) salaryDay = existing.account.salaryDay
  }

  const account = await prisma.$transaction(async (tx) => {
    const created = await tx.account.create({
      data: { name, salaryDay, bankId },
    })
    await tx.accountMember.create({
      data: {
        accountId: created.id,
        userId: user.id,
        role: AccountMemberRole.OWNER,
      },
    })
    return created
  })

  return NextResponse.json(
    {
      id: account.id,
      name: account.name,
      salaryDay: account.salaryDay,
      bankId: account.bankId,
      role: AccountMemberRole.OWNER,
      isActive: false,
      createdAt: account.createdAt,
    },
    { status: 201 }
  )
}
