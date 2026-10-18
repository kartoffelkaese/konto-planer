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
  /** Ablaufdatum des Levels – bei laufendem Abo inklusive Kulanz */
  planExpiresAt: string | null
  /** Laufendes Abo: Ende des bezahlten Zeitraums (ohne Kulanz), sonst `null` */
  paidUntil: string | null
  isAdmin: boolean
  /** Stripe-Abo: Status (`active`, `past_due`, `canceled` …), `null` ohne Abo */
  subscriptionStatus: string | null
  /** Es gibt einen Stripe-Kunden – Abgleich möglich, auch wenn noch kein Abo-Stand bekannt ist */
  hasStripeCustomer: boolean
  subscriptionRunning: boolean
  planInterval: 'MONTHLY' | 'YEARLY' | null
  cancelAtPeriodEnd: boolean
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
