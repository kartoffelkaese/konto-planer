export type SplitListStatus = 'ACTIVE' | 'ARCHIVED'
export type SplitListRole = 'OWNER' | 'MEMBER'
export type SplitInviteStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED'

export interface SplitCategory {
  id: string
  splitListId: string
  name: string
  color: string | null
  sortOrder: number | null
  createdAt: string
}

export interface SplitParticipant {
  id: string
  splitListId: string
  displayName: string
  userId: string | null
  sortOrder: number | null
  createdAt: string
  hasAccount?: boolean
  pendingInvite?: boolean
}

export interface SplitExpense {
  id: string
  splitListId: string
  paidByParticipantId: string
  categoryId: string | null
  amount: number
  description: string
  date: string
  createdById: string
  createdAt: string
  paidBy?: SplitParticipant
  category?: SplitCategory | null
  shareParticipantIds: string[]
}

export interface SplitSettlement {
  id: string
  splitListId: string
  fromParticipantId: string
  toParticipantId: string
  amount: number
  settledAt: string
  settledById: string
  note: string | null
  createdAt: string
  fromParticipant?: SplitParticipant
  toParticipant?: SplitParticipant
}

export interface SplitListSummary {
  id: string
  name: string
  description: string | null
  status: SplitListStatus
  createdAt: string
  archivedAt: string | null
  role: SplitListRole
  participantCount: number
  expenseCount: number
  totalExpenses: number
}

export interface SplitListDetail extends SplitListSummary {
  participants: SplitParticipant[]
  categories: SplitCategory[]
}

export interface SplitBalanceEntry {
  participantId: string
  displayName: string
  paid: number
  owed: number
  net: number
}

export interface SplitDebtSuggestion {
  fromParticipantId: string
  fromDisplayName: string
  toParticipantId: string
  toDisplayName: string
  amount: number
}

export interface SplitBalancesResponse {
  balances: SplitBalanceEntry[]
  suggestions: SplitDebtSuggestion[]
  totalExpenses: number
}

export interface SplitHistoryResponse {
  settlements: SplitSettlement[]
  expenses: SplitExpense[]
  categoryTotals: { categoryId: string | null; categoryName: string; total: number }[]
  totalExpenses: number
}

export interface SplitInviteReceived {
  id: string
  splitListId: string
  splitListName: string
  invitedByEmail: string
  participantDisplayName: string | null
  createdAt: string
}

export interface CreateSplitListData {
  name: string
  description?: string
  participantNames?: string[]
  categoryNames?: string[]
}

export interface CreateSplitExpenseData {
  paidByParticipantId: string
  amount: number
  description: string
  date: string
  categoryId?: string | null
  shareParticipantIds?: string[]
}
