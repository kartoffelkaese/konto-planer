import type { PlanId, PlanSourceId } from '@/lib/plans'

/** Nutzer in der Verwaltung – bewusst ohne Finanzdaten */
export type AdminUser = {
  id: string
  email: string
  emailVerified: boolean
  createdAt: string
  /** Letzte Anmeldung mit Passwort; `null`, wenn seit Einführung des Felds keine stattfand */
  lastLoginAt: string | null
  /** Gespeichertes Level */
  plan: PlanId
  /** Level, das gerade gilt (Ablaufdatum berücksichtigt) */
  effectivePlan: PlanId
  planSource: PlanSourceId | null
  planExpiresAt: string | null
  isAdmin: boolean
  ownedAccounts: number
  splitLists: number
}

export type AdminUsersResponse = {
  users: AdminUser[]
  total: number
  page: number
  pageSize: number
}

export type AdminPlanChange = {
  id: string
  fromPlan: PlanId
  toPlan: PlanId
  source: PlanSourceId
  expiresAt: string | null
  note: string | null
  changedByEmail: string | null
  createdAt: string
}
