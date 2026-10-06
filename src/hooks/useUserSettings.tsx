'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import type { AccountMemberRole } from '@prisma/client'
import { isAccountWritable } from '@/lib/accountPermissions'
import { ApiError, getUserSettings } from '@/lib/api'
import { ACCOUNT_CHANGED_EVENT } from '@/lib/accountSwitchEvents'
import { getEntitlements, type Entitlements, type PlanId, type PlanSourceId } from '@/lib/plans'

export type UserSettings = {
  id: string
  email: string
  salaryDay: number
  accountName: string | null
  transferSenderName?: string | null
  splitDisplayName?: string | null
  bankId?: string | null
  isSimpleAccount?: boolean
  createdAt: string
  activeAccountId?: string
  role?: AccountMemberRole
  pendingEmail?: string | null
  /** Eigenes Level (bereits mit Ablaufdatum und PLANS_ENABLED verrechnet) */
  plan?: PlanId
  /** Level des Inhabers des aktiven Kontos */
  accountPlan?: PlanId
  /** Schreibschutz des aktiven Kontos durch das Level (`limit` / `shared`) */
  planLock?: 'limit' | 'shared' | null
  keptAccountId?: string | null
  planSource?: PlanSourceId | null
  planExpiresAt?: string | null
  plansEnabled?: boolean
  isAdmin?: boolean
}

type UserSettingsValue = {
  settings: UserSettings | null
  role: AccountMemberRole | undefined
  canWrite: boolean
  salaryDay: number | null
  accountName: string
  isSimpleAccount: boolean
  /** Eigenes Level – bis die Einstellungen geladen sind „Komplett“, damit nichts kurz gesperrt aufblitzt */
  plan: PlanId
  /** Was der Nutzer selbst darf (Konten, Split-Listen anlegen) */
  entitlements: Entitlements
  /** Was im aktiven Konto möglich ist (Level des Inhabers: Statistiken, CSV-Import, Teilen) */
  accountEntitlements: Entitlements
  isAdmin: boolean
  loading: boolean
  error: string | null
  reload: () => void
}

type LoadState = {
  /** Nutzer, zu dem `settings` gehören – nach Ab-/Ummelden gelten sie nicht mehr */
  userId: string | null
  settings: UserSettings | null
  loading: boolean
  error: string | null
}

const UserSettingsContext = createContext<UserSettingsValue | null>(null)

/**
 * Lädt die Einstellungen des aktiven Kontos einmal für die ganze App (statt in jeder
 * Komponente einzeln). Neu geladen wird bei Anmeldung, Kontowechsel bzw. Speichern
 * (`account-changed`, mit Ladeanzeige) und beim Seitenwechsel (im Hintergrund).
 */
export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const userId = session?.user?.id ?? null
  const [state, setState] = useState<LoadState>({
    userId: null,
    settings: null,
    loading: true,
    error: null,
  })
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    if (status === 'loading' || !userId) return
    let active = true
    getUserSettings().then(
      (data) => {
        if (active) setState({ userId, settings: data, loading: false, error: null })
      },
      (err: unknown) => {
        if (!active) return
        if (err instanceof ApiError && err.status === 401) {
          setState({ userId, settings: null, loading: false, error: null })
          return
        }
        console.error('Error loading user settings:', err)
        setState((prev) => ({
          ...prev,
          userId,
          loading: false,
          error: 'Einstellungen konnten nicht geladen werden',
        }))
      }
    )
    // Veraltete Antworten (Seite oder Konto inzwischen gewechselt) verwerfen
    return () => {
      active = false
    }
  }, [status, userId, pathname, reloadCount])

  /** Mit Ladeanzeige neu laden (Kontowechsel, Speichern) */
  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    setReloadCount((count) => count + 1)
  }, [])

  useEffect(() => {
    window.addEventListener(ACCOUNT_CHANGED_EVENT, reload)
    return () => window.removeEventListener(ACCOUNT_CHANGED_EVENT, reload)
  }, [reload])

  // Ohne Anmeldung (oder für einen anderen Nutzer geladen) gibt es keine Einstellungen
  const current = state.userId === userId ? state : null
  const settings = userId ? (current?.settings ?? null) : null
  const loading =
    status === 'loading' || (userId != null && (current == null || current.loading))
  const error = userId ? (current?.error ?? null) : null

  const role = settings?.role
  const plan: PlanId = settings?.plan ?? 'FULL'
  const accountPlan: PlanId = settings?.accountPlan ?? 'FULL'
  const isAdmin = settings?.isAdmin ?? false
  const value = useMemo<UserSettingsValue>(
    () => ({
      settings,
      role,
      canWrite: (role ? isAccountWritable(role) : true) && !settings?.planLock,
      salaryDay: settings?.salaryDay ?? null,
      accountName: settings?.accountName ?? 'Mein Konto',
      isSimpleAccount: settings?.isSimpleAccount ?? false,
      plan,
      entitlements: getEntitlements(plan),
      accountEntitlements: getEntitlements(accountPlan),
      isAdmin,
      loading,
      error,
      reload,
    }),
    [settings, role, plan, accountPlan, isAdmin, loading, error, reload]
  )

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>
}

/** Einstellungen des aktiven Kontos (geteilt über `UserSettingsProvider`) */
export function useUserSettings(): UserSettingsValue {
  const context = useContext(UserSettingsContext)
  if (!context) {
    throw new Error('useUserSettings muss innerhalb von UserSettingsProvider verwendet werden')
  }
  return context
}
