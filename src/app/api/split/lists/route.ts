import { NextResponse } from 'next/server'
import { SplitListRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import { DEFAULT_SPLIT_CATEGORIES } from '@/lib/splitBalances'
import {
  dedupeDisplayNameAgainst,
  getSplitDisplayNameForUser,
} from '@/lib/splitUserDisplayName'
import { serializeListSummary } from '@/lib/splitSerialize'

export async function GET() {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  const memberships = await prisma.splitListMember.findMany({
    where: { userId: user.id },
    include: {
      splitList: {
        include: {
          _count: { select: { participants: true, expenses: true } },
          expenses: { select: { amount: true } },
        },
      },
    },
    orderBy: { splitList: { createdAt: 'desc' } },
  })

  const lists = memberships.map((m) =>
    serializeListSummary(m.splitList, m.role)
  )

  return NextResponse.json(lists)
}

export async function POST(request: Request) {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  let body: {
    name?: string
    description?: string
    participantNames?: string[]
    categoryNames?: string[]
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })
  }

  const participantNames = (body.participantNames ?? [])
    .map((n) => n.trim())
    .filter((n) => n.length > 0)

  const uniqueParticipants = [...new Set(participantNames)]

  const categoryInput =
    body.categoryNames && body.categoryNames.length > 0
      ? body.categoryNames.map((n) => n.trim()).filter(Boolean)
      : DEFAULT_SPLIT_CATEGORIES.map((c) => c.name)

  const categoryColors = new Map(
    DEFAULT_SPLIT_CATEGORIES.map((c) => [c.name, c.color])
  )

  const session = await auth()
  const creatorBaseName = await getSplitDisplayNameForUser(
    user.id,
    session?.activeAccountId
  )
  const ownerDisplayName = dedupeDisplayNameAgainst(creatorBaseName, uniqueParticipants)

  const list = await prisma.$transaction(async (tx) => {
    const created = await tx.splitList.create({
      data: {
        name,
        description: body.description?.trim() || null,
        createdById: user.id,
        members: {
          create: {
            userId: user.id,
            role: SplitListRole.OWNER,
          },
        },
        participants: {
          create: [
            {
              displayName: ownerDisplayName,
              userId: user.id,
              sortOrder: 0,
            },
            ...uniqueParticipants.map((displayName, index) => ({
              displayName,
              sortOrder: index + 1,
            })),
          ],
        },
        categories: {
          create: categoryInput.map((categoryName, index) => ({
            name: categoryName,
            color: categoryColors.get(categoryName) ?? null,
            sortOrder: index,
          })),
        },
      },
      include: {
        _count: { select: { participants: true, expenses: true } },
        expenses: { select: { amount: true } },
      },
    })

    return created
  })

  return NextResponse.json(serializeListSummary(list, SplitListRole.OWNER), {
    status: 201,
  })
}
