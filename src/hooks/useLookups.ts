'use client'

import { getCategories, getMerchants, getTransferTargets } from '@/lib/api'
import { useApiQuery } from '@/hooks/useApiQuery'

type LookupOptions = {
  /** Zusatz zum Cache-Schlüssel, z. B. eine Transaktions-ID: ändert er sich, wird neu geladen */
  reloadKey?: string
  onError?: (error: unknown) => void
}

/** Händler des aktiven Kontos */
export function useMerchants({ reloadKey = '', onError }: LookupOptions = {}) {
  const query = useApiQuery(`merchants:${reloadKey}`, getMerchants, { onError })
  return { ...query, merchants: query.data ?? [] }
}

/** Mögliche Zielkonten für Umbuchungen */
export function useTransferTargets({ reloadKey = '', onError }: LookupOptions = {}) {
  const query = useApiQuery(`transfer-targets:${reloadKey}`, getTransferTargets, { onError })
  return { ...query, transferTargets: query.data ?? [] }
}

/** Kategorien des aktiven Kontos */
export function useCategories({ reloadKey = '', onError }: LookupOptions = {}) {
  const query = useApiQuery(`categories:${reloadKey}`, () => getCategories(), { onError })
  return { ...query, categories: query.data ?? [] }
}
