import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext, requireWritableContext } from '@/lib/account-context'
import {
  isErrorResponse,
  validateSalaryDay,
  validateAccountDisplayName,
  validateTransferSenderName,
  validateBankId,
} from '@/lib/api-auth'

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) return ctx

    const writeError = requireWritableContext(ctx)
    if (writeError) return writeError

    const { user, account, membership } = ctx
    const body = await request.json()

    const data: {
      salaryDay?: number
      name?: string
      transferSenderName?: string | null
      bankId?: string | null
    } = {}

    if (body.salaryDay !== undefined) {
      const salaryDay = validateSalaryDay(body.salaryDay)
      if (isErrorResponse(salaryDay)) return salaryDay
      data.salaryDay = salaryDay
    }

    if (body.accountName !== undefined || body.name !== undefined) {
      const name = validateAccountDisplayName(body.accountName ?? body.name)
      if (isErrorResponse(name)) return name
      if (name) data.name = name
    }

    if (body.transferSenderName !== undefined) {
      const senderName = validateTransferSenderName(body.transferSenderName)
      if (isErrorResponse(senderName)) return senderName
      data.transferSenderName = senderName
    }

    if (body.bankId !== undefined) {
      const bankId = validateBankId(body.bankId)
      if (isErrorResponse(bankId)) return bankId
      data.bankId = bankId ?? null
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Keine Änderungen angegeben' }, { status: 400 })
    }

    const updated = await prisma.account.update({
      where: { id: account.id },
      data,
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      salaryDay: updated.salaryDay,
      accountName: updated.name,
      transferSenderName: updated.transferSenderName,
      bankId: updated.bankId,
      createdAt: updated.createdAt,
      activeAccountId: account.id,
      role: membership.role,
    })
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
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) return ctx

    const { user, account, membership } = ctx

    return NextResponse.json({
      id: user.id,
      email: user.email,
      salaryDay: account.salaryDay,
      accountName: account.name,
      transferSenderName: account.transferSenderName,
      bankId: account.bankId,
      createdAt: account.createdAt,
      activeAccountId: account.id,
      role: membership.role,
    })
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
