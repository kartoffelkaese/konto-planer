import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { isErrorResponse } from '@/lib/api-auth'
import { getStoredPlan } from '@/lib/plans'
import { withErrorHandling } from '@/lib/route-handler'
import type { AdminUsersResponse } from '@/types/admin'

const PAGE_SIZE = 25

export const GET = withErrorHandling('/api/admin/users', async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (isErrorResponse(admin)) return admin

  const { searchParams } = new URL(request.url)
  const query = (searchParams.get('q') ?? '').trim().slice(0, 100)
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const where = query ? { email: { contains: query } } : {}

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      // Nur Stammdaten und Zählwerte – keine Konten-, Buchungs- oder Split-Inhalte
      select: {
        id: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true,
        plan: true,
        planSource: true,
        planExpiresAt: true,
        isAdmin: true,
        _count: {
          select: {
            memberships: { where: { role: 'OWNER' } },
            splitListsCreated: true,
          },
        },
      },
    }),
  ])

  const body: AdminUsersResponse = {
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified !== null,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      plan: user.plan,
      effectivePlan: getStoredPlan(user),
      planSource: user.planSource,
      planExpiresAt: user.planExpiresAt?.toISOString() ?? null,
      isAdmin: user.isAdmin,
      ownedAccounts: user._count.memberships,
      splitLists: user._count.splitListsCreated,
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
  }

  return NextResponse.json(body)
})
