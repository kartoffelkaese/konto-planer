import type {
  SplitCategory,
  SplitExpense,
  SplitListDetail,
  SplitListSummary,
  SplitParticipant,
  SplitSettlement,
} from '@/types/split'
import { decimalToNumber } from '@/lib/splitAccess'

type ExpenseWithRelations = {
  id: string
  splitListId: string
  paidByParticipantId: string
  categoryId: string | null
  amount: { toString(): string }
  description: string
  date: Date
  createdById: string
  createdAt: Date
  paidBy?: Parameters<typeof serializeParticipant>[0] | null
  category?: Parameters<typeof serializeCategory>[0] | null
  shares?: { participantId: string }[]
}

export function serializeParticipant(
  p: {
    id: string
    splitListId: string
    displayName: string
    userId: string | null
    sortOrder: number | null
    createdAt: Date
  },
  options?: { hasAccount?: boolean; pendingInvite?: boolean }
): SplitParticipant {
  return {
    id: p.id,
    splitListId: p.splitListId,
    displayName: p.displayName,
    userId: p.userId,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt.toISOString(),
    hasAccount: options?.hasAccount,
    pendingInvite: options?.pendingInvite,
  }
}

export function serializeCategory(c: {
  id: string
  splitListId: string
  name: string
  color: string | null
  sortOrder: number | null
  createdAt: Date
}): SplitCategory {
  return {
    id: c.id,
    splitListId: c.splitListId,
    name: c.name,
    color: c.color,
    sortOrder: c.sortOrder,
    createdAt: c.createdAt.toISOString(),
  }
}

export function serializeExpense(e: ExpenseWithRelations): SplitExpense {
  return {
    id: e.id,
    splitListId: e.splitListId,
    paidByParticipantId: e.paidByParticipantId,
    categoryId: e.categoryId,
    amount: decimalToNumber(e.amount),
    description: e.description,
    date: e.date.toISOString(),
    createdById: e.createdById,
    createdAt: e.createdAt.toISOString(),
    paidBy: e.paidBy ? serializeParticipant(e.paidBy) : undefined,
    category: e.category ? serializeCategory(e.category) : null,
    shareParticipantIds: e.shares?.map((s) => s.participantId) ?? [],
  }
}

export function serializeSettlement(
  s: {
    id: string
    splitListId: string
    fromParticipantId: string
    toParticipantId: string
    amount: { toString(): string }
    settledAt: Date
    settledById: string
    note: string | null
    createdAt: Date
    fromParticipant?: Parameters<typeof serializeParticipant>[0] | null
    toParticipant?: Parameters<typeof serializeParticipant>[0] | null
  }
): SplitSettlement {
  return {
    id: s.id,
    splitListId: s.splitListId,
    fromParticipantId: s.fromParticipantId,
    toParticipantId: s.toParticipantId,
    amount: decimalToNumber(s.amount),
    settledAt: s.settledAt.toISOString(),
    settledById: s.settledById,
    note: s.note,
    createdAt: s.createdAt.toISOString(),
    fromParticipant: s.fromParticipant
      ? serializeParticipant(s.fromParticipant)
      : undefined,
    toParticipant: s.toParticipant
      ? serializeParticipant(s.toParticipant)
      : undefined,
  }
}

export function serializeListSummary(
  list: {
    id: string
    name: string
    description: string | null
    status: 'ACTIVE' | 'ARCHIVED'
    createdAt: Date
    archivedAt: Date | null
    _count?: { participants: number; expenses: number }
    expenses?: { amount: { toString(): string } }[]
  },
  role: 'OWNER' | 'MEMBER'
): SplitListSummary {
  const totalExpenses =
    list.expenses?.reduce((sum, e) => sum + decimalToNumber(e.amount), 0) ?? 0

  return {
    id: list.id,
    name: list.name,
    description: list.description,
    status: list.status,
    createdAt: list.createdAt.toISOString(),
    archivedAt: list.archivedAt?.toISOString() ?? null,
    role,
    participantCount: list._count?.participants ?? 0,
    expenseCount: list._count?.expenses ?? 0,
    totalExpenses,
  }
}

export function serializeListDetail(
  list: {
    id: string
    name: string
    description: string | null
    status: 'ACTIVE' | 'ARCHIVED'
    createdAt: Date
    archivedAt: Date | null
    participants: Parameters<typeof serializeParticipant>[0][]
    categories: Parameters<typeof serializeCategory>[0][]
    _count?: { participants: number; expenses: number }
    expenses?: { amount: { toString(): string } }[]
  },
  role: 'OWNER' | 'MEMBER',
  participantMeta?: Map<string, { hasAccount?: boolean; pendingInvite?: boolean }>
): SplitListDetail {
  const summary = serializeListSummary(list, role)
  return {
    ...summary,
    participants: list.participants.map((p) =>
      serializeParticipant(p, participantMeta?.get(p.id))
    ),
    categories: list.categories.map(serializeCategory),
  }
}
