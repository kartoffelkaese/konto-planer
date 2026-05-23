import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  AccountInviteStatus,
  AccountMemberRole,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAccountContextForAccountId } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'
import { normalizeEmail } from '@/lib/accounts'
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
} from '@/lib/rate-limit'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id: accountId } = await params
  const ctx = await getAccountContextForAccountId(accountId)
  if (isErrorResponse(ctx)) return ctx

  if (ctx.membership.role !== AccountMemberRole.OWNER) {
    return NextResponse.json(
      { error: 'Nur Kontoinhaber können Mitglieder verwalten' },
      { status: 403 }
    )
  }

  const members = await prisma.accountMember.findMany({
    where: { accountId },
    include: {
      user: { select: { id: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const invites = await prisma.accountInvite.findMany({
    where: {
      accountId,
      status: AccountInviteStatus.PENDING,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      role: m.role,
      createdAt: m.createdAt,
    })),
    pendingInvites: invites.map((i) => ({
      id: i.id,
      email: i.email,
      createdAt: i.createdAt,
    })),
  })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: accountId } = await params
  const ctx = await getAccountContextForAccountId(accountId)
  if (isErrorResponse(ctx)) return ctx

  if (ctx.membership.role !== AccountMemberRole.OWNER) {
    return NextResponse.json(
      { error: 'Nur Kontoinhaber können einladen' },
      { status: 403 }
    )
  }

  const ip = getClientIp(request.headers)
  const { allowed } = checkRateLimit(
    `invite:${accountId}:${ip}`,
    RATE_LIMITS.register
  )
  if (!allowed) {
    return NextResponse.json(
      { error: 'Zu viele Einladungen. Bitte später erneut versuchen.' },
      { status: 429 }
    )
  }

  const body = await request.json()
  const rawEmail = body.email
  if (!rawEmail || typeof rawEmail !== 'string') {
    return NextResponse.json({ error: 'E-Mail erforderlich' }, { status: 400 })
  }

  const email = normalizeEmail(rawEmail)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: 'Bitte geben Sie eine gültige E-Mail-Adresse ein' },
      { status: 400 }
    )
  }

  if (email === normalizeEmail(ctx.user.email)) {
    return NextResponse.json(
      { error: 'Sie können sich nicht selbst einladen' },
      { status: 400 }
    )
  }

  const existingMember = await prisma.accountMember.findFirst({
    where: {
      accountId,
      user: { email },
    },
  })
  if (existingMember) {
    return NextResponse.json(
      { error: 'Diese Person hat bereits Zugriff auf das Konto' },
      { status: 400 }
    )
  }

  const existingInvite = await prisma.accountInvite.findUnique({
    where: { accountId_email: { accountId, email } },
  })
  if (
    existingInvite?.status === AccountInviteStatus.PENDING
  ) {
    return NextResponse.json(
      { error: 'Für diese E-Mail liegt bereits eine ausstehende Einladung vor' },
      { status: 400 }
    )
  }

  await prisma.accountInvite.upsert({
    where: {
      accountId_email: { accountId, email },
    },
    create: {
      accountId,
      email,
      invitedByUserId: ctx.user.id,
      status: AccountInviteStatus.PENDING,
    },
    update: {
      status: AccountInviteStatus.PENDING,
      invitedByUserId: ctx.user.id,
    },
  })

  return NextResponse.json({
    status: 'pending',
    message:
      'Einladung gesendet. Die Person kann sie in den Einstellungen annehmen oder ablehnen.',
  })
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: accountId } = await params
  const ctx = await getAccountContextForAccountId(accountId)
  if (isErrorResponse(ctx)) return ctx

  if (ctx.membership.role !== AccountMemberRole.OWNER) {
    return NextResponse.json(
      { error: 'Nur Kontoinhaber können Zugriff entziehen' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { memberId, inviteId } = body

  if (inviteId) {
    await prisma.accountInvite.updateMany({
      where: {
        id: inviteId,
        accountId,
        status: AccountInviteStatus.PENDING,
      },
      data: { status: AccountInviteStatus.REVOKED },
    })
    return NextResponse.json({ message: 'Einladung widerrufen' })
  }

  if (!memberId) {
    return NextResponse.json(
      { error: 'memberId oder inviteId erforderlich' },
      { status: 400 }
    )
  }

  const target = await prisma.accountMember.findFirst({
    where: { id: memberId, accountId },
  })

  if (!target) {
    return NextResponse.json({ error: 'Mitglied nicht gefunden' }, { status: 404 })
  }

  if (target.userId === ctx.user.id) {
    return NextResponse.json(
      { error: 'Sie können sich nicht selbst entfernen' },
      { status: 400 }
    )
  }

  if (target.role === AccountMemberRole.OWNER) {
    const ownerCount = await prisma.accountMember.count({
      where: { accountId, role: AccountMemberRole.OWNER },
    })
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: 'Der letzte Inhaber kann nicht entfernt werden' },
        { status: 400 }
      )
    }
  }

  await prisma.accountMember.delete({ where: { id: memberId } })

  return NextResponse.json({ message: 'Zugriff entfernt' })
}
