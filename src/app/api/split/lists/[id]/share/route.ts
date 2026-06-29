import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import {
  requireSplitListAccess,
  requireSplitListOwner,
} from '@/lib/splitAccess'
import {
  buildSplitShareUrl,
  generateShareToken,
} from '@/lib/splitShareToken'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const ownerError = requireSplitListOwner(access)
  if (ownerError) return ownerError

  const list = await prisma.splitList.findUnique({
    where: { id },
    select: {
      shareEnabled: true,
      shareEnabledAt: true,
      shareTokenHash: true,
    },
  })

  if (!list) {
    return NextResponse.json({ error: 'Liste nicht gefunden' }, { status: 404 })
  }

  if (!list.shareEnabled || !list.shareTokenHash) {
    return NextResponse.json({
      shareEnabled: false,
      shareEnabledAt: null,
    })
  }

  return NextResponse.json({
    shareEnabled: true,
    shareEnabledAt: list.shareEnabledAt?.toISOString() ?? null,
  })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const ownerError = requireSplitListOwner(access)
  if (ownerError) return ownerError

  let body: { shareEnabled?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  if (typeof body.shareEnabled !== 'boolean') {
    return NextResponse.json(
      { error: 'shareEnabled muss true oder false sein' },
      { status: 400 }
    )
  }

  if (body.shareEnabled) {
    const { rawToken, tokenHash } = generateShareToken()
    const updated = await prisma.splitList.update({
      where: { id },
      data: {
        shareEnabled: true,
        shareTokenHash: tokenHash,
        shareEnabledAt: new Date(),
      },
      select: {
        shareEnabled: true,
        shareEnabledAt: true,
      },
    })

    return NextResponse.json({
      shareEnabled: updated.shareEnabled,
      shareEnabledAt: updated.shareEnabledAt?.toISOString() ?? null,
      shareUrl: buildSplitShareUrl(rawToken),
    })
  }

  const updated = await prisma.splitList.update({
    where: { id },
    data: {
      shareEnabled: false,
      shareTokenHash: null,
      shareEnabledAt: null,
    },
    select: {
      shareEnabled: true,
      shareEnabledAt: true,
    },
  })

  return NextResponse.json({
    shareEnabled: updated.shareEnabled,
    shareEnabledAt: null,
  })
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const ownerError = requireSplitListOwner(access)
  if (ownerError) return ownerError

  const { rawToken, tokenHash } = generateShareToken()
  const updated = await prisma.splitList.update({
    where: { id },
    data: {
      shareEnabled: true,
      shareTokenHash: tokenHash,
      shareEnabledAt: new Date(),
    },
    select: {
      shareEnabled: true,
      shareEnabledAt: true,
    },
  })

  return NextResponse.json({
    shareEnabled: updated.shareEnabled,
    shareEnabledAt: updated.shareEnabledAt?.toISOString() ?? null,
    shareUrl: buildSplitShareUrl(rawToken),
  })
}
