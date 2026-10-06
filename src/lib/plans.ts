/**
 * Benutzerlevel („Start“ und „Komplett“): die einzige Stelle, an der steht, was welches Level darf.
 *
 * Rein und ohne Datenbankzugriff – auch im Browser nutzbar. Ob Level überhaupt gelten
 * (`PLANS_ENABLED`), entscheidet der Server; die Oberfläche bekommt das Ergebnis über
 * `/api/users/settings`.
 */

export type PlanId = 'BASIC' | 'FULL'
export type PlanSourceId = 'LEGACY' | 'TRIAL' | 'MANUAL' | 'STRIPE'

export type Entitlements = {
  /** Höchstzahl eigener Konten; `null` = unbegrenzt */
  maxOwnedAccounts: number | null
  /** Eigenes Konto mit anderen teilen */
  shareAccounts: boolean
  statistics: boolean
  /** Kontoauszug als CSV importieren (Backup einspielen ist davon unabhängig) */
  csvImport: boolean
  /** Eigene Split-Listen anlegen und bearbeiten, inkl. Freigabe-Link und Fremdwährungen */
  splitOwnLists: boolean
}

export const PLAN_ENTITLEMENTS: Record<PlanId, Entitlements> = {
  BASIC: {
    maxOwnedAccounts: 1,
    shareAccounts: false,
    statistics: false,
    csvImport: false,
    splitOwnLists: false,
  },
  FULL: {
    maxOwnedAccounts: null,
    shareAccounts: true,
    statistics: true,
    csvImport: true,
    splitOwnLists: true,
  },
}

export const PLAN_LABELS: Record<PlanId, string> = {
  BASIC: 'Start',
  FULL: 'Komplett',
}

/** Dauer der Testphase für neue Nutzer (ab bestätigter E-Mail-Adresse) */
export const TRIAL_DAYS = 14

const DAY_MS = 24 * 60 * 60 * 1000

export type PlanFields = {
  plan: PlanId
  planExpiresAt?: Date | string | null
}

/**
 * Level gelten nur, wenn `PLANS_ENABLED=true` gesetzt ist. Ohne den Schalter (z. B. bei
 * eigenen Installationen) haben alle Nutzer „Komplett“.
 */
export function plansEnabled(value: string | undefined = process.env.PLANS_ENABLED): boolean {
  return value === 'true'
}

/** Gespeichertes Level unter Berücksichtigung des Ablaufdatums – ohne den Schalter `PLANS_ENABLED` */
export function getStoredPlan(user: PlanFields, now: Date = new Date()): PlanId {
  if (user.plan !== 'FULL') return 'BASIC'
  if (user.planExpiresAt == null) return 'FULL'
  return new Date(user.planExpiresAt).getTime() > now.getTime() ? 'FULL' : 'BASIC'
}

/** Das Level, das für den Nutzer gerade gilt */
export function getEffectivePlan(
  user: PlanFields,
  now: Date = new Date(),
  enabled: boolean = plansEnabled()
): PlanId {
  return enabled ? getStoredPlan(user, now) : 'FULL'
}

export function getEntitlements(plan: PlanId): Entitlements {
  return PLAN_ENTITLEMENTS[plan]
}

/** Das höhere von mehreren Leveln (z. B. bei mehreren Inhabern eines Kontos) */
export function highestPlan(plans: PlanId[]): PlanId {
  return plans.includes('FULL') ? 'FULL' : 'BASIC'
}

export function trialEndsAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + TRIAL_DAYS * DAY_MS)
}

/** Verbleibende Tage eines befristeten Levels (aufgerundet), `null` wenn unbefristet oder abgelaufen */
export function daysLeft(
  planExpiresAt: Date | string | null | undefined,
  now: Date = new Date()
): number | null {
  if (planExpiresAt == null) return null
  const remaining = new Date(planExpiresAt).getTime() - now.getTime()
  return remaining > 0 ? Math.ceil(remaining / DAY_MS) : null
}

/**
 * Eigene Konten, die beschreibbar bleiben, wenn mehr vorhanden sind als das Level erlaubt
 * (z. B. nach dem Ende der Testphase). `null` = alle. Vorrang hat das gewählte Konto,
 * danach die ältesten.
 *
 * @param ownedAccountIds eigene Konten, ältestes zuerst
 */
export function writableOwnedAccountIds(
  ownedAccountIds: string[],
  keptAccountId: string | null | undefined,
  maxOwnedAccounts: number | null
): string[] | null {
  if (maxOwnedAccounts === null || ownedAccountIds.length <= maxOwnedAccounts) return null
  const kept = keptAccountId && ownedAccountIds.includes(keptAccountId) ? [keptAccountId] : []
  const others = ownedAccountIds.filter((id) => !kept.includes(id))
  return [...kept, ...others].slice(0, maxOwnedAccounts)
}

/** Was die Level enthalten – für Einstellungen, Hinweise und die Startseite */
export const PLAN_FEATURES: Record<PlanId, string[]> = {
  BASIC: [
    'Ein Konto',
    'Buchungen und wiederkehrende Zahlungen',
    'Übersicht',
    'Backup exportieren und einspielen',
    'Mitmachen, wenn dich jemand in ein Konto oder eine Split-Liste einlädt',
  ],
  FULL: [
    'Beliebig viele Konten und Umbuchungen dazwischen',
    'Konten mit anderen teilen',
    'Statistiken',
    'CSV-Import von Kontoauszügen',
    'Eigene Split-Listen mit Freigabe-Link und Fremdwährungen',
  ],
}
